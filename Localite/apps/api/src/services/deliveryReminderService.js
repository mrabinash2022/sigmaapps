import { Op } from 'sequelize';
import { Order } from '../models/index.js';
import { OrderStatus } from '@localite/shared';
import { sendPushToUser } from './notificationService.js';
import logger from '../logging/logger.js';

export async function processDeliveryReminders() {
  const now = new Date();
  const due = await Order.findAll({
    where: {
      orderStatus: { [Op.in]: [OrderStatus.ACCEPTED, OrderStatus.SHIPPED] },
      deliveryReminderAt: { [Op.lte]: now },
      deliveryReminderSentAt: null,
    },
    include: [
      { association: 'customer', attributes: ['id', 'name'] },
      { association: 'shop', attributes: ['id', 'name'] },
    ],
    limit: 50,
  });

  let sent = 0;
  for (const order of due) {
    if (!order.customerId) continue;
    await sendPushToUser(order.customerId, {
      title: 'Delivery reminder',
      body: `${order.shop?.name || 'Your shop'}: delivery window ${order.deliveryTimeWindow || 'soon'}.`,
      data: { orderId: order.id, screen: 'OrderDetail' },
    });
    await order.update({ deliveryReminderSentAt: now });
    sent += 1;
  }

  if (sent > 0) {
    logger.info('Delivery reminders sent', { count: sent });
  }
  return { sent };
}

export function startDeliveryReminderScheduler() {
  const intervalMs = Number(process.env.DELIVERY_REMINDER_INTERVAL_MS || 5 * 60 * 1000);
  processDeliveryReminders().catch((err) => logger.warn('Delivery reminder run failed', { error: err.message }));
  return setInterval(() => {
    processDeliveryReminders().catch((err) => logger.warn('Delivery reminder run failed', { error: err.message }));
  }, intervalMs);
}
