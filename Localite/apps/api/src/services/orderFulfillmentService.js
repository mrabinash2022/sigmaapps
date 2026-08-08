import { Order } from '../models/index.js';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  buildFulfillmentLinesFromOrder,
  buildFulfillmentPayload,
  buildVisualOrderPayload,
  FulfillmentLineStatus,
  getUnavailableLines,
  getFulfilledLines,
  normalizeFulfillmentInput,
  parseDeliveryReminderAt,
} from '@localite/shared';
import { buildVisualOrderText, applyFulfillmentStockAdjustments } from './catalogService.js';
import { recordOrderEvent } from './orderService.js';
import { notifyOrderUpdate } from './notificationService.js';
import { resolveOrderPricing } from './orderPricingService.js';

function buildBackorderCatalogPayload(unavailableLines) {
  const catalogItems = unavailableLines
    .filter((l) => l.kind === 'catalog' && l.quantityFulfilled < l.quantityRequested)
    .map((line) => {
      const missingQty = line.quantityRequested - line.quantityFulfilled;
      return {
        catalogItemId: line.catalogItemId,
        name: line.name,
        quantity: missingQty,
        unitPrice: line.unitPrice,
        sizeLabel: line.sizeLabel,
        unit: 'piece',
        imageUrl: line.imageUrl,
        lineTotal: Number(line.unitPrice) * missingQty,
      };
    });

  const textLines = unavailableLines
    .filter((l) => l.kind === 'text' && l.status === FulfillmentLineStatus.UNAVAILABLE)
    .map((l) => l.text || l.name);

  const imageLines = unavailableLines.filter(
    (l) => l.kind === 'image' && l.status === FulfillmentLineStatus.UNAVAILABLE,
  );

  return buildVisualOrderPayload({
    catalogItems,
    extraText: textLines.join('\n'),
    imageUrl: imageLines[0]?.imageUrl || null,
    note: 'Backorder — items unavailable on previous order',
  });
}

export async function acceptOrderWithFulfillment({
  order,
  finalBillAmount,
  deliveryTimeWindow,
  fulfillmentLines,
  shopNote,
  createBackorder,
  actorId,
  offerId,
  subtotalAmount,
}) {
  const normalized = normalizeFulfillmentInput(fulfillmentLines);
  const unavailable = getUnavailableLines(normalized);
  const fulfilled = getFulfilledLines(normalized);
  const hasUnavailable = unavailable.length > 0;

  if (!fulfilled.length) {
    const err = new Error('At least one item must be available to accept. Reject the order if nothing can be fulfilled.');
    err.statusCode = 400;
    throw err;
  }

  if (hasUnavailable && !shopNote?.trim() && unavailable.some((l) => !l.unavailableReason)) {
    const err = new Error('Add a note or reason for unavailable items');
    err.statusCode = 400;
    throw err;
  }

  const fulfillmentPayload = buildFulfillmentPayload({
    lines: normalized,
    shopNote,
    finalBillAmount,
  });

  const subtotal = subtotalAmount != null ? Number(subtotalAmount) : Number(finalBillAmount);
  const pricing = await resolveOrderPricing({
    shopId: order.shopId,
    subtotalAmount: subtotal,
    offerId,
  });

  const deliveryReminderAt = parseDeliveryReminderAt(deliveryTimeWindow);

  await order.update({
    orderStatus: OrderStatus.ACCEPTED,
    finalBillAmount: pricing.finalBillAmount,
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    appliedOfferId: pricing.appliedOfferId,
    deliveryTimeWindow,
    deliveryReminderAt,
    deliveryReminderSentAt: null,
    fulfillmentPayload: {
      ...fulfillmentPayload,
      appliedOffer: pricing.appliedOffer || null,
    },
  });

  await applyFulfillmentStockAdjustments(normalized);

  let backorderOrder = null;
  if (createBackorder && hasUnavailable) {
    const backorderPayload = buildBackorderCatalogPayload(unavailable);
    const textSummary = buildVisualOrderText({ catalogPayload: backorderPayload });

    backorderOrder = await Order.create({
      customerId: order.customerId,
      shopId: order.shopId,
      parentOrderId: order.id,
      orderType: backorderPayload.items.length ? OrderType.CATALOG : OrderType.TEXT_LIST,
      orderStatus: OrderStatus.BACKORDER_WAITING,
      textPayload: ['── Backorder (waiting for stock) ──', textSummary].filter(Boolean).join('\n'),
      catalogPayload: backorderPayload,
      imagePayloadUrl: backorderPayload.imageUrl,
      paymentStatus: PaymentStatus.PENDING,
    });

    await recordOrderEvent({
      orderId: backorderOrder.id,
      fromStatus: null,
      toStatus: OrderStatus.BACKORDER_WAITING,
      actorId,
      note: `Backorder created from order ${order.id.slice(0, 8)}… — waiting for unavailable items`,
    });

    fulfillmentPayload.backorderOrderId = backorderOrder.id;
    await order.update({ fulfillmentPayload });
  }

  const unavailableNote = hasUnavailable
    ? ` Unavailable: ${fulfillmentPayload.unavailableSummary.join('; ')}.`
  : '';
  const backorderNote = backorderOrder
    ? ` Backorder ${backorderOrder.id.slice(0, 8)}… created for missing items.`
    : '';

  await recordOrderEvent({
    orderId: order.id,
    fromStatus: OrderStatus.CREATED,
    toStatus: OrderStatus.ACCEPTED,
    actorId,
    note: `Accepted. Amount: ₹${pricing.finalBillAmount}${pricing.discountAmount ? ` (discount ₹${pricing.discountAmount})` : ''}, Window: ${deliveryTimeWindow}.${unavailableNote}${backorderNote}`,
  });

  return { order, backorderOrder, fulfillmentPayload };
}

export async function activateBackorderOrder({
  order,
  finalBillAmount,
  deliveryTimeWindow,
  actorId,
  offerId,
  subtotalAmount,
}) {
  if (order.orderStatus !== OrderStatus.BACKORDER_WAITING) {
    const err = new Error('Order is not waiting for backorder stock');
    err.statusCode = 400;
    throw err;
  }

  const fromStatus = order.orderStatus;
  const subtotal = subtotalAmount != null ? Number(subtotalAmount) : Number(finalBillAmount);
  const pricing = await resolveOrderPricing({
    shopId: order.shopId,
    subtotalAmount: subtotal,
    offerId,
  });
  const deliveryReminderAt = parseDeliveryReminderAt(deliveryTimeWindow);

  await order.update({
    orderStatus: OrderStatus.ACCEPTED,
    finalBillAmount: pricing.finalBillAmount,
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    appliedOfferId: pricing.appliedOfferId,
    deliveryTimeWindow,
    deliveryReminderAt,
    deliveryReminderSentAt: null,
    fulfillmentPayload: {
      ...(order.fulfillmentPayload || {}),
      activatedAt: new Date().toISOString(),
      backorderReady: true,
      appliedOffer: pricing.appliedOffer || null,
    },
  });

  await recordOrderEvent({
    orderId: order.id,
    fromStatus,
    toStatus: OrderStatus.ACCEPTED,
    actorId,
    note: `Backorder items now available. Amount: ₹${pricing.finalBillAmount}, Window: ${deliveryTimeWindow}`,
  });

  const { getOrderWithDetails } = await import('./orderService.js');
  const full = await getOrderWithDetails(order.id);
  await notifyOrderUpdate(full, 'BackorderReady').catch(console.error);
  return full;
}

export function resolveFulfillmentLinesForAccept(order, inputLines) {
  if (inputLines?.length) return inputLines;
  const { lines } = buildFulfillmentLinesFromOrder(order);
  return lines;
}
