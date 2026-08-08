import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../database.js';
import { Order, Shop, ShopUser, ShopStoreInfo } from '../models/index.js';
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  isShopOrderable,
  hasUnavailableItems,
  buildVisualOrderPayload,
  canCustomerCancelOrder,
  isWithinDeliveryRadius,
  buildScheduledFields,
} from '@localite/shared';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
import {
  assertTransition,
  canShip,
  orderRequiresRefund,
  validateAcceptPayload,
  validateRejectPayload,
  validateReturnPayload,
  validateCancelPayload,
} from '../services/orderStateMachine.js';
import { createOrderFromReorder } from '../services/orderReorderService.js';
import { getOrderWithDetails, recordOrderEvent } from '../services/orderService.js';
import {
  acceptOrderWithFulfillment,
  activateBackorderOrder,
  resolveFulfillmentLinesForAccept,
} from '../services/orderFulfillmentService.js';
import { buildCatalogOrderPayload, assertVisualOrderHasContent, buildVisualOrderText, buildStoredOrderPayload, shopSupportsVisualCatalog } from '../services/catalogService.js';
import { uploadImage } from '../services/storageService.js';
import { notifyOrderUpdate } from '../services/notificationService.js';
import { assertShopAcceptingOrders } from '../services/storeInfoService.js';
import {
  createRazorpayOrder,
  isRazorpayEnabled,
  refundPayment,
  verifyRazorpaySignature,
} from '../services/razorpayService.js';
import { resolveDeliverySnapshot } from '../services/addressService.js';
import { resolveOrderPricing } from '../services/orderPricingService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
  },
});

const router = Router();

async function assertShopAccess(user, shopId) {
  if (user.role === UserRole.SUPER_ADMIN) return true;
  if (user.role !== UserRole.ADMIN) {
    const err = new Error('Shop access requires admin role');
    err.statusCode = 403;
    throw err;
  }
  const link = await ShopUser.findOne({ where: { userId: user.id, shopId } });
  if (!link) {
    const err = new Error('You do not have access to this shop');
    err.statusCode = 403;
    throw err;
  }
  const shop = await Shop.findByPk(shopId);
  if (!shop || !isShopOrderable(shop)) {
    const err = new Error('Shop is not enabled to accept orders');
    err.statusCode = 403;
    throw err;
  }
  return true;
}

async function notifyAfterUpdate(orderId, event) {
  const order = await getOrderWithDetails(orderId);
  await notifyOrderUpdate(order, event).catch(console.error);
  return order;
}

async function buildDeliveryFields(userId, body) {
  return resolveDeliverySnapshot(userId, {
    addressId: body.addressId,
    deliveryAddress: body.deliveryAddress,
    deliveryAreaId: body.deliveryAreaId,
    deliveryLatitude: body.deliveryLatitude,
    deliveryLongitude: body.deliveryLongitude,
  });
}

async function assertDeliveryInRadius(shop, deliveryFields) {
  if (!shop.deliveryRadiusKm) return;
  const ok = isWithinDeliveryRadius(
    shop.latitude,
    shop.longitude,
    shop.deliveryRadiusKm,
    deliveryFields.deliveryLatitude,
    deliveryFields.deliveryLongitude,
  );
  if (!ok) {
    const err = new Error(`This shop only delivers within ${shop.deliveryRadiusKm} km`);
    err.statusCode = 400;
    throw err;
  }
}

router.post(
  '/submit-flexible-order',
  authenticate,
  requireRole(UserRole.CUSTOMER),
  requireOnboarded,
  upload.single('image'),
  async (req, res, next) => {
    try {
      const { shopId, textPayload } = req.body;
      if (!shopId) return res.status(400).json({ error: 'shopId is required' });

      const shop = await Shop.findByPk(shopId);
      if (!shop || !isShopOrderable(shop)) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      await assertShopAcceptingOrders(ShopStoreInfo, shopId);
      const deliveryFields = await buildDeliveryFields(req.user.id, req.body);
      await assertDeliveryInRadius(shop, deliveryFields);
      const scheduledFields = buildScheduledFields(req.body);

      let orderType = OrderType.TEXT_LIST;
      let imagePayloadUrl = null;

      if (req.file) {
        orderType = OrderType.IMAGE_SCAN;
        imagePayloadUrl = await uploadImage(req.file);
      } else if (!textPayload?.trim()) {
        return res.status(400).json({ error: 'Provide textPayload or an image upload' });
      }

      const catalogPayload = buildVisualOrderPayload({
        extraText: textPayload?.trim() || '',
        imageUrl: imagePayloadUrl,
      });

      const order = await Order.create({
        customerId: req.user.id,
        shopId,
        orderType,
        textPayload: textPayload?.trim() || null,
        imagePayloadUrl,
        catalogPayload,
        orderStatus: OrderStatus.CREATED,
        paymentStatus: PaymentStatus.PENDING,
        ...deliveryFields,
        ...scheduledFields,
      });

      await recordOrderEvent({
        orderId: order.id,
        fromStatus: null,
        toStatus: OrderStatus.CREATED,
        actorId: req.user.id,
        note: 'Order placed by customer',
      });

      const full = await notifyAfterUpdate(order.id, 'Created');
      res.status(201).json({ order: full });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/submit-catalog-order',
  authenticate,
  requireRole(UserRole.CUSTOMER),
  requireOnboarded,
  upload.single('image'),
  async (req, res, next) => {
    try {
      const { shopId, note, extraText, textPayload } = req.body;
      if (!shopId) return res.status(400).json({ error: 'shopId is required' });

      const shop = await Shop.findByPk(shopId);
      if (!shop || !isShopOrderable(shop)) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      await assertShopAcceptingOrders(ShopStoreInfo, shopId);
      const deliveryFields = await buildDeliveryFields(req.user.id, req.body);
      await assertDeliveryInRadius(shop, deliveryFields);
      const scheduledFields = buildScheduledFields(req.body);
      if (!(await shopSupportsVisualCatalog(shop))) {
        return res.status(400).json({ error: 'This shop does not support visual catalog ordering' });
      }

      let items = [];
      if (req.body.items) {
        items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
      }

      const catalogPayload = items.length
        ? await buildCatalogOrderPayload(shopId, items)
        : { items: [], estimatedTotal: 0, itemCount: 0 };

      const additionalText = (extraText || textPayload || '').trim();
      let imagePayloadUrl = null;
      if (req.file) {
        imagePayloadUrl = await uploadImage(req.file);
      }

      assertVisualOrderHasContent({ catalogPayload, textPayload: additionalText, imagePayloadUrl });

      const storedPayload = buildStoredOrderPayload({
        catalogPayload,
        extraText: additionalText,
        imagePayloadUrl,
        note: note?.trim(),
      });

      const orderType = storedPayload.items.length
        ? OrderType.CATALOG
        : imagePayloadUrl
          ? OrderType.IMAGE_SCAN
          : OrderType.TEXT_LIST;

      const textSummary = buildVisualOrderText({
        catalogPayload: storedPayload,
        note: note?.trim(),
      });

      const order = await Order.create({
        customerId: req.user.id,
        shopId,
        orderType,
        textPayload: textSummary || additionalText || null,
        imagePayloadUrl,
        catalogPayload: storedPayload,
        orderStatus: OrderStatus.CREATED,
        paymentStatus: PaymentStatus.PENDING,
        ...deliveryFields,
        ...scheduledFields,
      });

      const eventNote = storedPayload.items.length
        ? `Visual catalog order — ${storedPayload.itemCount} item(s), est. ₹${storedPayload.estimatedTotal ?? '—'}`
        : imagePayloadUrl
          ? 'Visual store order — photo list uploaded'
          : 'Visual store order — text list';

      await recordOrderEvent({
        orderId: order.id,
        fromStatus: null,
        toStatus: OrderStatus.CREATED,
        actorId: req.user.id,
        note: eventNote,
      });

      const full = await notifyAfterUpdate(order.id, 'Created');
      res.status(201).json({ order: full });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/reorder/:orderId',
  authenticate,
  requireRole(UserRole.CUSTOMER),
  requireOnboarded,
  async (req, res, next) => {
    try {
      const sourceOrder = await getOrderWithDetails(req.params.orderId);
      if (!sourceOrder) return res.status(404).json({ error: 'Order not found' });
      if (sourceOrder.customerId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const order = await createOrderFromReorder(sourceOrder, req.user.id, req.body);
      res.status(201).json({ order });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/my', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.user.id },
      include: [
        { association: 'shop', attributes: ['id', 'name', 'category'] },
        { association: 'events', order: [['createdAt', 'ASC']] },
        {
          association: 'backorderOrders',
          attributes: ['id', 'orderStatus', 'createdAt'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get('/shop/:shopId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    await assertShopAccess(req.user, req.params.shopId);
    const orders = await Order.findAll({
      where: { shopId: req.params.shopId },
      include: [
        { association: 'customer', attributes: ['id', 'name', 'phone', 'address'] },
        { association: 'events', order: [['createdAt', 'ASC']] },
      ],
      order: [
        [
          sequelize.literal(`CASE order_status
            WHEN 'Created' THEN 1
            WHEN 'Backorder_Waiting' THEN 2
            WHEN 'Accepted' THEN 3
            WHEN 'Shipped' THEN 4
            WHEN 'Delivered' THEN 5
            WHEN 'Rejected' THEN 6
            WHEN 'Returned' THEN 7
            ELSE 8 END`),
          'ASC',
        ],
        ['createdAt', 'ASC'],
      ],
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get('/:orderId', authenticate, async (req, res, next) => {
  try {
    const order = await getOrderWithDetails(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isCustomer = order.customerId === req.user.id;
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    let isShopStaff = false;
    if (req.user.role === UserRole.ADMIN) {
      isShopStaff = Boolean(await ShopUser.findOne({ where: { userId: req.user.id, shopId: order.shopId } }));
    }
    if (!isCustomer && !isShopStaff && !isSuperAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/accept/:orderId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const {
      finalBillAmount,
      deliveryTimeWindow,
      fulfillment,
      createBackorder = false,
      offerId,
      subtotalAmount,
    } = req.body;
    validateAcceptPayload({ finalBillAmount, deliveryTimeWindow });

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await assertShopAccess(req.user, order.shopId);
    assertTransition(order.orderStatus, OrderStatus.ACCEPTED);

    const fulfillmentLines = resolveFulfillmentLinesForAccept(order, fulfillment?.lines);
    const { backorderOrder } = await acceptOrderWithFulfillment({
      order,
      finalBillAmount,
      deliveryTimeWindow,
      fulfillmentLines,
      shopNote: fulfillment?.shopNote,
      createBackorder: Boolean(createBackorder),
      actorId: req.user.id,
      offerId,
      subtotalAmount,
    });

    const full = await getOrderWithDetails(order.id);
    const notifyEvent = hasUnavailableItems(full) ? 'PartialAccepted' : 'Accepted';
    await notifyOrderUpdate(full, notifyEvent).catch(console.error);
    if (backorderOrder) {
      const backorderFull = await getOrderWithDetails(backorderOrder.id);
      await notifyOrderUpdate(backorderFull, 'BackorderCreated').catch(console.error);
    }

    res.json({ order: full, backorderOrder });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/backorder-ready/:orderId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { finalBillAmount, deliveryTimeWindow } = req.body;
    validateAcceptPayload({ finalBillAmount, deliveryTimeWindow });

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await assertShopAccess(req.user, order.shopId);
    assertTransition(order.orderStatus, OrderStatus.ACCEPTED);

    const full = await activateBackorderOrder({
      order,
      finalBillAmount,
      deliveryTimeWindow,
      actorId: req.user.id,
    });

    res.json({ order: full });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/reject/:orderId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { reason } = req.body;
    validateRejectPayload({ reason });

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await assertShopAccess(req.user, order.shopId);
    assertTransition(order.orderStatus, OrderStatus.REJECTED);

    const fromStatus = order.orderStatus;
    const rejectionReason = reason.trim();
    await order.update({ orderStatus: OrderStatus.REJECTED, rejectionReason });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.REJECTED,
      actorId: req.user.id,
      note: `Rejected by shop: ${rejectionReason}`,
    });

    const full = await notifyAfterUpdate(order.id, 'Rejected');
    res.json({ order: full });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/cancel/:orderId', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const { reason } = req.body;
    validateCancelPayload({ reason });

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!canCustomerCancelOrder(order)) {
      return res.status(400).json({
        error: 'This order can no longer be cancelled. Contact the shop if you need help.',
      });
    }

    assertTransition(order.orderStatus, OrderStatus.CANCELLED);

    const fromStatus = order.orderStatus;
    const cancellationReason = reason.trim();
    await order.update({
      orderStatus: OrderStatus.CANCELLED,
      cancellationReason,
      cancelledAt: new Date(),
    });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.CANCELLED,
      actorId: req.user.id,
      note: `Cancelled by customer: ${cancellationReason}`,
    });

    const full = await notifyAfterUpdate(order.id, 'Cancelled');
    res.json({ order: full });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/select-payment/:orderId', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the customer can select payment method' });
    }
    if (order.orderStatus !== OrderStatus.ACCEPTED) {
      return res.status(400).json({ error: 'Payment can only be selected after order is accepted' });
    }

    const paymentStatus =
      paymentMethod === PaymentMethod.CASH_ON_DELIVERY
        ? PaymentStatus.NOT_REQUIRED
        : PaymentStatus.PENDING;

    await order.update({ paymentMethod, paymentStatus });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus: order.orderStatus,
      toStatus: order.orderStatus,
      actorId: req.user.id,
      note: `Payment method selected: ${paymentMethod}`,
    });

    res.json({ order: await getOrderWithDetails(order.id) });
  } catch (err) {
    next(err);
  }
});

// Create Razorpay order for UPI payment
router.post('/transition/create-razorpay-order/:orderId', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (order.paymentMethod !== PaymentMethod.UPI_INSTANT) {
      return res.status(400).json({ error: 'UPI payment not selected for this order' });
    }
    if (!isRazorpayEnabled()) {
      return res.status(503).json({ error: 'Razorpay not configured. Use mock pay endpoint in dev.' });
    }

    const rzpOrder = await createRazorpayOrder({
      amount: order.finalBillAmount,
      orderId: order.id,
    });

    await order.update({ razorpayOrderId: rzpOrder.id });

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    next(err);
  }
});

// Verify Razorpay payment (client-side callback)
router.post('/transition/verify-payment/:orderId', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    if (isRazorpayEnabled()) {
      const valid = verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
      if (!valid) return res.status(400).json({ error: 'Payment verification failed' });
    }

    await order.update({
      paymentStatus: PaymentStatus.PAID,
      razorpayOrderId,
      razorpayPaymentId,
    });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus: order.orderStatus,
      toStatus: order.orderStatus,
      actorId: req.user.id,
      note: 'UPI payment completed via Razorpay',
    });

    res.json({ order: await getOrderWithDetails(order.id) });
  } catch (err) {
    next(err);
  }
});

// Dev-only mock payment when Razorpay not configured
router.patch('/transition/pay/:orderId', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    if (isRazorpayEnabled()) {
      return res.status(400).json({ error: 'Use create-razorpay-order and verify-payment endpoints' });
    }

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (order.paymentMethod !== PaymentMethod.UPI_INSTANT) {
      return res.status(400).json({ error: 'UPI payment not applicable' });
    }

    await order.update({ paymentStatus: PaymentStatus.PAID });
    await recordOrderEvent({
      orderId: order.id,
      fromStatus: order.orderStatus,
      toStatus: order.orderStatus,
      actorId: req.user.id,
      note: 'UPI payment completed (dev mock)',
    });

    res.json({ order: await getOrderWithDetails(order.id) });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/ship/:orderId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await assertShopAccess(req.user, order.shopId);
    assertTransition(order.orderStatus, OrderStatus.SHIPPED);
    canShip(order);

    const fromStatus = order.orderStatus;
    await order.update({ orderStatus: OrderStatus.SHIPPED });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.SHIPPED,
      actorId: req.user.id,
      note: 'Order dispatched for delivery',
    });

    const full = await notifyAfterUpdate(order.id, 'Shipped');
    res.json({ order: full });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/deliver/:orderId', authenticate, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isCustomer = order.customerId === req.user.id && req.user.role === UserRole.CUSTOMER;
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    let isShopStaff = false;
    if (req.user.role === UserRole.ADMIN) {
      isShopStaff = Boolean(await ShopUser.findOne({ where: { userId: req.user.id, shopId: order.shopId } }));
    }

    if (!isCustomer && !isShopStaff && !isSuperAdmin) {
      return res.status(403).json({ error: 'Not authorized to mark delivered' });
    }

    assertTransition(order.orderStatus, OrderStatus.DELIVERED);

    const fromStatus = order.orderStatus;
    await order.update({ orderStatus: OrderStatus.DELIVERED });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.DELIVERED,
      actorId: req.user.id,
      note: isCustomer ? 'Confirmed received by customer' : 'Marked delivered by shop',
    });

    const full = await notifyAfterUpdate(order.id, 'Delivered');
    res.json({ order: full });
  } catch (err) {
    next(err);
  }
});

router.post('/pricing-preview', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { shopId, subtotalAmount, offerId } = req.body;
    if (!shopId || !subtotalAmount) {
      return res.status(400).json({ error: 'shopId and subtotalAmount are required' });
    }
    await assertShopAccess(req.user, shopId);
    const pricing = await resolveOrderPricing({ shopId, subtotalAmount, offerId });
    res.json({ pricing });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/cod-collect/:orderId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await assertShopAccess(req.user, order.shopId);

    if (order.paymentMethod !== PaymentMethod.CASH_ON_DELIVERY) {
      return res.status(400).json({ error: 'This order is not cash on delivery' });
    }
    if (order.codCollectedAt) {
      return res.status(400).json({ error: 'Cash already marked as received' });
    }

    await order.update({
      codCollectedAt: new Date(),
      paymentStatus: PaymentStatus.PAID,
    });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus: order.orderStatus,
      toStatus: order.orderStatus,
      actorId: req.user.id,
      note: 'COD cash received',
    });

    res.json({ order: await getOrderWithDetails(order.id) });
  } catch (err) {
    next(err);
  }
});

router.patch('/transition/return/:orderId', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const { reason } = req.body;
    validateReturnPayload({ reason });

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the customer can return this order' });
    }

    assertTransition(order.orderStatus, OrderStatus.RETURNED);

    const fromStatus = order.orderStatus;
    const returnReason = reason.trim();
    const needsRefund = orderRequiresRefund(order);
    const updates = {
      orderStatus: OrderStatus.RETURNED,
      returnReason,
      returnedAt: new Date(),
    };
    if (needsRefund) {
      updates.paymentStatus = PaymentStatus.REFUND_PENDING;
    }

    await order.update(updates);

    await recordOrderEvent({
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.RETURNED,
      actorId: req.user.id,
      note: needsRefund
        ? `Returned by customer (refund required): ${returnReason}`
        : `Returned by customer: ${returnReason}`,
    });

    const full = await notifyAfterUpdate(order.id, 'Returned');
    res.json({ order: full, refundRequired: needsRefund });
  } catch (err) {
    next(err);
  }
});

router.post('/transition/refund/:orderId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await assertShopAccess(req.user, order.shopId);

    if (order.orderStatus !== OrderStatus.RETURNED) {
      return res.status(400).json({ error: 'Refund is only available for returned orders' });
    }
    if (order.paymentStatus !== PaymentStatus.REFUND_PENDING) {
      return res.status(400).json({ error: 'This order does not have a pending refund' });
    }

    let razorpayRefundId = null;

    if (isRazorpayEnabled() && order.razorpayPaymentId) {
      const refund = await refundPayment({
        paymentId: order.razorpayPaymentId,
        amount: order.finalBillAmount,
        orderId: order.id,
      });
      razorpayRefundId = refund.id;
    } else if (isRazorpayEnabled() && !order.razorpayPaymentId) {
      return res.status(400).json({
        error: 'Cannot process Razorpay refund — payment ID missing on order. Use dev mock refund if in development.',
      });
    }

    await order.update({
      paymentStatus: PaymentStatus.REFUNDED,
      razorpayRefundId,
    });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus: order.orderStatus,
      toStatus: order.orderStatus,
      actorId: req.user.id,
      note: razorpayRefundId
        ? `Refund processed via Razorpay (${razorpayRefundId})`
        : 'Refund marked complete (dev mock — no Razorpay payment ID)',
    });

    const full = await notifyAfterUpdate(order.id, 'Refunded');
    res.json({ order: full });
  } catch (err) {
    next(err);
  }
});

export default router;
