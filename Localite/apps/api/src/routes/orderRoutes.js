import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Order, Shop, ShopUser } from '../models/index.js';
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  isShopOrderable,
} from '@localite/shared';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
import {
  assertTransition,
  canShip,
  validateAcceptPayload,
} from '../services/orderStateMachine.js';
import { getOrderWithDetails, recordOrderEvent } from '../services/orderService.js';
import { uploadImage } from '../services/storageService.js';
import { notifyOrderUpdate } from '../services/notificationService.js';
import {
  createRazorpayOrder,
  isRazorpayEnabled,
  verifyRazorpaySignature,
} from '../services/razorpayService.js';

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

      let orderType = OrderType.TEXT_LIST;
      let imagePayloadUrl = null;

      if (req.file) {
        orderType = OrderType.IMAGE_SCAN;
        imagePayloadUrl = await uploadImage(req.file);
      } else if (!textPayload?.trim()) {
        return res.status(400).json({ error: 'Provide textPayload or an image upload' });
      }

      const order = await Order.create({
        customerId: req.user.id,
        shopId,
        orderType,
        textPayload: textPayload?.trim() || null,
        imagePayloadUrl,
        orderStatus: OrderStatus.CREATED,
        paymentStatus: PaymentStatus.PENDING,
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

router.get('/my', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.user.id },
      include: [
        { association: 'shop', attributes: ['id', 'name', 'category'] },
        { association: 'events', order: [['createdAt', 'ASC']] },
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
      order: [['createdAt', 'DESC']],
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
    const { finalBillAmount, deliveryTimeWindow } = req.body;
    validateAcceptPayload({ finalBillAmount, deliveryTimeWindow });

    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await assertShopAccess(req.user, order.shopId);
    assertTransition(order.orderStatus, OrderStatus.ACCEPTED);

    const fromStatus = order.orderStatus;
    await order.update({ orderStatus: OrderStatus.ACCEPTED, finalBillAmount, deliveryTimeWindow });

    await recordOrderEvent({
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.ACCEPTED,
      actorId: req.user.id,
      note: `Accepted. Amount: ₹${finalBillAmount}, Window: ${deliveryTimeWindow}`,
    });

    const full = await notifyAfterUpdate(order.id, 'Accepted');
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

export default router;
