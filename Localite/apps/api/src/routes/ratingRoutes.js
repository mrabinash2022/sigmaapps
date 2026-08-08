import { Router } from 'express';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
import { UserRole } from '@localite/shared';
import { rateOrder, getOrderRating } from '../services/ratingService.js';
import { Order } from '../models/index.js';

const router = Router();

router.post('/orders/:orderId', authenticate, requireRole(UserRole.CUSTOMER), requireOnboarded, async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const row = await rateOrder({
      orderId: req.params.orderId,
      customerId: req.user.id,
      rating,
      comment,
    });
    res.status(201).json({ rating: row });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:orderId', authenticate, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== req.user.id && req.user.role === UserRole.CUSTOMER) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const rating = await getOrderRating(order.id);
    res.json({ rating });
  } catch (err) {
    next(err);
  }
});

export default router;
