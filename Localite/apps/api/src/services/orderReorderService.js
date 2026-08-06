import { Order, Shop } from '../models/index.js';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  isShopOrderable,
  parseCatalogPayload,
  canReorderOrder,
  isDeliveredOrder,
} from '@localite/shared';
import {
  assertVisualOrderHasContent,
  buildCatalogOrderPayload,
  buildStoredOrderPayload,
  buildVisualOrderText,
} from './catalogService.js';
import { getOrderWithDetails, recordOrderEvent } from './orderService.js';
import { notifyOrderUpdate } from './notificationService.js';

function extractReorderContent(sourceOrder) {
  const payload = parseCatalogPayload(sourceOrder);
  let extraText = '';
  if (payload?.textLines?.length) {
    extraText = payload.textLines.join('\n');
  } else if (sourceOrder.textPayload) {
    const marker = '── Additional items (text) ──';
    const idx = sourceOrder.textPayload.indexOf(marker);
    if (idx !== -1) {
      const after = sourceOrder.textPayload.slice(idx + marker.length).trim();
      const noteIdx = after.indexOf('Note:');
      extraText = (noteIdx === -1 ? after : after.slice(0, noteIdx)).trim();
    } else if (!payload?.items?.length) {
      extraText = sourceOrder.textPayload.trim();
    }
  }

  const note = payload?.note || null;
  const imageUrl = payload?.imageUrl || sourceOrder.imagePayloadUrl || null;

  const cartItems = (payload?.items || []).map((item) => ({
    catalogItemId: item.catalogItemId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    sizeLabel: item.sizeLabel,
    unit: item.unit,
    imageUrl: item.imageUrl,
  }));

  return { cartItems, extraText, imageUrl, note };
}

export function assertCanReorder(sourceOrder) {
  if (!sourceOrder) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }
  if (!isDeliveredOrder(sourceOrder)) {
    const err = new Error('Only delivered orders can be reordered');
    err.statusCode = 400;
    throw err;
  }
  if (!canReorderOrder(sourceOrder)) {
    const err = new Error('This order has no items to reorder');
    err.statusCode = 400;
    throw err;
  }
}

export async function createOrderFromReorder(sourceOrder, customerId) {
  assertCanReorder(sourceOrder);

  const shop = await Shop.findByPk(sourceOrder.shopId);
  if (!shop || !isShopOrderable(shop)) {
    const err = new Error('This shop is not accepting orders right now');
    err.statusCode = 400;
    throw err;
  }

  const { cartItems, extraText, imageUrl, note } = extractReorderContent(sourceOrder);

  const catalogPayload = cartItems.length
    ? await buildCatalogOrderPayload(shop.id, cartItems)
    : { items: [], estimatedTotal: 0, itemCount: 0 };

  assertVisualOrderHasContent({
    catalogPayload,
    textPayload: extraText,
    imagePayloadUrl: imageUrl,
  });

  const storedPayload = buildStoredOrderPayload({
    catalogPayload,
    extraText,
    imagePayloadUrl: imageUrl,
    note,
  });

  const orderType = storedPayload.items.length
    ? OrderType.CATALOG
    : imageUrl
      ? OrderType.IMAGE_SCAN
      : OrderType.TEXT_LIST;

  const textSummary = buildVisualOrderText({
    catalogPayload: storedPayload,
    note,
  });

  const order = await Order.create({
    customerId,
    shopId: shop.id,
    orderType,
    textPayload: [
      '── Reorder ──',
      textSummary || extraText || null,
    ].filter(Boolean).join('\n'),
    imagePayloadUrl: imageUrl,
    catalogPayload: storedPayload,
    orderStatus: OrderStatus.CREATED,
    paymentStatus: PaymentStatus.PENDING,
  });

  await recordOrderEvent({
    orderId: order.id,
    fromStatus: null,
    toStatus: OrderStatus.CREATED,
    actorId: customerId,
    note: `Reorder from previous order (${sourceOrder.id.slice(0, 8)}…)`,
  });

  const full = await getOrderWithDetails(order.id);
  await notifyOrderUpdate(full, 'Created').catch(console.error);
  return full;
}
