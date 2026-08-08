import { Op, fn, col, literal } from 'sequelize';
import { Order, Shop, User } from '../models/index.js';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@localite/shared';

export async function getPlatformAnalytics({ days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const orders = await Order.findAll({
    where: {
      createdAt: { [Op.gte]: since },
      orderStatus: { [Op.notIn]: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
    },
    attributes: [
      'orderStatus',
      'paymentStatus',
      'paymentMethod',
      [fn('COUNT', col('Order.id')), 'count'],
      [fn('COALESCE', fn('SUM', col('final_bill_amount')), 0), 'revenue'],
    ],
    group: ['orderStatus', 'paymentStatus', 'paymentMethod'],
    raw: true,
  });

  const totals = await Order.findOne({
    where: {
      createdAt: { [Op.gte]: since },
      orderStatus: { [Op.in]: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.ACCEPTED] },
    },
    attributes: [
      [fn('COUNT', col('id')), 'orderCount'],
      [fn('COALESCE', fn('SUM', col('final_bill_amount')), 0), 'grossRevenue'],
      [fn('COALESCE', fn('SUM', col('discount_amount')), 0), 'totalDiscounts'],
    ],
    raw: true,
  });

  const topShops = await Order.findAll({
    where: {
      createdAt: { [Op.gte]: since },
      orderStatus: OrderStatus.DELIVERED,
    },
    attributes: [
      'shopId',
      [fn('COUNT', col('Order.id')), 'orderCount'],
      [fn('COALESCE', fn('SUM', col('final_bill_amount')), 0), 'revenue'],
    ],
    include: [{ model: Shop, as: 'shop', attributes: ['id', 'name', 'category'] }],
    group: ['shopId', 'shop.id', 'shop.name', 'shop.category'],
    order: [[literal('revenue'), 'DESC']],
    limit: 10,
  });

  const refunds = await Order.count({
    where: {
      createdAt: { [Op.gte]: since },
      paymentStatus: { [Op.in]: [PaymentStatus.REFUND_PENDING, PaymentStatus.REFUNDED] },
    },
  });

  return {
    rangeDays: Number(days),
    since: since.toISOString(),
    summary: {
      orderCount: Number(totals?.orderCount || 0),
      grossRevenue: Number(totals?.grossRevenue || 0),
      totalDiscounts: Number(totals?.totalDiscounts || 0),
      refundCount: refunds,
    },
    breakdown: orders,
    topShops: topShops.map((row) => ({
      shopId: row.shopId,
      shopName: row.shop?.name,
      category: row.shop?.category,
      orderCount: Number(row.get('orderCount')),
      revenue: Number(row.get('revenue')),
    })),
  };
}

export async function getShopInsights(shopId, { days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const [statusRows, revenue, avgBill, returns, codPending] = await Promise.all([
    Order.findAll({
      where: { shopId, createdAt: { [Op.gte]: since } },
      attributes: ['orderStatus', [fn('COUNT', col('id')), 'count']],
      group: ['orderStatus'],
      raw: true,
    }),
    Order.sum('finalBillAmount', {
      where: {
        shopId,
        createdAt: { [Op.gte]: since },
        orderStatus: OrderStatus.DELIVERED,
      },
    }),
    Order.findOne({
      where: {
        shopId,
        createdAt: { [Op.gte]: since },
        finalBillAmount: { [Op.ne]: null },
      },
      attributes: [[fn('AVG', col('final_bill_amount')), 'avgBill']],
      raw: true,
    }),
    Order.count({
      where: { shopId, createdAt: { [Op.gte]: since }, orderStatus: OrderStatus.RETURNED },
    }),
    Order.count({
      where: {
        shopId,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: PaymentStatus.NOT_REQUIRED,
        orderStatus: OrderStatus.DELIVERED,
        codCollectedAt: null,
      },
    }),
  ]);

  return {
    rangeDays: Number(days),
    since: since.toISOString(),
    statusBreakdown: statusRows.map((r) => ({ status: r.orderStatus, count: Number(r.count) })),
    deliveredRevenue: Number(revenue || 0),
    averageBill: Number(avgBill?.avgBill || 0),
    returnCount: returns,
    codPendingCollection: codPending,
  };
}
