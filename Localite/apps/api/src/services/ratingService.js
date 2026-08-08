import { fn, col } from 'sequelize';
import { Order, OrderRating, Shop } from '../models/index.js';
import { OrderStatus } from '@localite/shared';

export async function getShopRatingSummary(shopIds) {
  if (!shopIds?.length) return {};

  const rows = await OrderRating.findAll({
    where: { shopId: shopIds },
    attributes: [
      'shopId',
      [fn('AVG', col('rating')), 'avgRating'],
      [fn('COUNT', col('id')), 'ratingCount'],
    ],
    group: ['shopId'],
    raw: true,
  });

  const map = {};
  for (const row of rows) {
    const shopId = row.shopId || row.shop_id;
    map[shopId] = {
      avgRating: Number(Number(row.avgRating || row.avg_rating).toFixed(1)),
      ratingCount: Number(row.ratingCount || row.rating_count),
    };
  }
  return map;
}

export async function rateOrder({ orderId, customerId, rating, comment }) {
  const order = await Order.findByPk(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }
  if (order.customerId !== customerId) {
    const err = new Error('Only the customer can rate this order');
    err.statusCode = 403;
    throw err;
  }
  if (order.orderStatus !== OrderStatus.DELIVERED) {
    const err = new Error('You can rate an order after it is delivered');
    err.statusCode = 400;
    throw err;
  }

  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    const err = new Error('Rating must be between 1 and 5');
    err.statusCode = 400;
    throw err;
  }

  const existing = await OrderRating.findOne({ where: { orderId } });
  if (existing) {
    const err = new Error('This order has already been rated');
    err.statusCode = 400;
    throw err;
  }

  return OrderRating.create({
    orderId,
    customerId,
    shopId: order.shopId,
    rating: score,
    comment: comment?.trim() || null,
  });
}

export async function getOrderRating(orderId) {
  return OrderRating.findOne({ where: { orderId } });
}
