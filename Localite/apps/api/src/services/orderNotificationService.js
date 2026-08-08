import { sendSms, sendWhatsApp } from './messagingService.js';
import { sendPushToUser } from './notificationService.js';
import { User } from '../models/index.js';
import logger from '../logging/logger.js';

export async function notifySupportTicketMessage(ticket, { sender, message, recipientUserId }) {
  if (!recipientUserId) return;

  const title = ticket.issueType?.replace(/_/g, ' ') || 'Support ticket';
  const body = `${sender?.name || 'Someone'}: ${message.slice(0, 120)}`;

  await sendPushToUser(recipientUserId, {
    title: `Support — ${title}`,
    body,
    data: {
      ticketId: ticket.id,
      orderId: ticket.orderId,
      screen: 'Support',
    },
  });
}

export async function notifyOrderStatusFallback(order, event, message) {
  if (!order?.customerId || !message) return;

  const customer = order.customer || await User.findByPk(order.customerId);
  if (!customer?.phone) return;

  const tasks = [];
  if (customer.smsNotificationsEnabled) {
    tasks.push(sendSms(customer.phone, message));
  }
  if (customer.whatsappNotificationsEnabled) {
    tasks.push(sendWhatsApp(customer.phone, message));
  }

  if (!tasks.length) return;

  const results = await Promise.allSettled(tasks);
  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      logger.warn('Order status fallback failed', { event, index: idx, error: result.reason?.message });
    }
  });
}
