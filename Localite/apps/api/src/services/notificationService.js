import { Expo } from 'expo-server-sdk';
import { PaymentStatus, formatFulfillmentSummary } from '@localite/shared';
import { UserDevice } from '../models/index.js';
import { notifyOrderStatusFallback } from './orderNotificationService.js';

const expo = new Expo();

export async function registerDevice(userId, expoPushToken, platform) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    throw Object.assign(new Error('Invalid Expo push token'), { statusCode: 400 });
  }

  const [device] = await UserDevice.findOrCreate({
    where: { userId, expoPushToken },
    defaults: { platform, isActive: true },
  });

  if (!device.isActive) {
    await device.update({ isActive: true, platform });
  }

  return device;
}

export async function unregisterDevice(userId, expoPushToken) {
  await UserDevice.update(
    { isActive: false },
    { where: { userId, expoPushToken } }
  );
}

export async function sendPushToUser(userId, { title, body, data = {} }) {
  const devices = await UserDevice.findAll({
    where: { userId, isActive: true },
  });

  const messages = devices
    .filter((d) => Expo.isExpoPushToken(d.expoPushToken))
    .map((d) => ({
      to: d.expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    }));

  if (!messages.length) return { sent: 0 };

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;

  for (const chunk of chunks) {
    const receipts = await expo.sendPushNotificationsAsync(chunk);
    sent += receipts.filter((r) => r.status === 'ok').length;
  }

  return { sent };
}

export async function notifyOrderUpdate(order, event) {
  const shopName = order.shop?.name || 'your shop';
  const messages = {
    Created: {
      customer: null,
      admin: { title: 'New order!', body: `New order from ${order.customer?.name}` },
    },
    Accepted: {
      customer: { title: 'Order accepted', body: `${shopName} accepted your order. Amount: ₹${order.finalBillAmount}` },
      admin: null,
    },
    PartialAccepted: {
      customer: {
        title: 'Order accepted with changes',
        body: `${shopName} accepted your order for ₹${order.finalBillAmount}. Unavailable: ${formatFulfillmentSummary(order) || 'some items'}.${order.fulfillmentPayload?.backorderOrderId ? ' A backorder was created for missing items.' : ''}`,
      },
      admin: null,
    },
    BackorderCreated: {
      customer: {
        title: 'Backorder placed',
        body: `${shopName} will deliver missing items when available. You will be notified to confirm payment.`,
      },
      admin: null,
    },
    BackorderReady: {
      customer: {
        title: 'Backorder ready',
        body: `${shopName} has your missing items ready. Amount: ₹${order.finalBillAmount}. Choose payment to proceed.`,
      },
      admin: null,
    },
    Shipped: {
      customer: { title: 'On the way', body: `Your order from ${shopName} has been shipped` },
      admin: null,
    },
    Rejected: {
      customer: {
        title: 'Order rejected',
        body: `${shopName} could not accept your order. ${order.rejectionReason || 'Please try again later.'}`,
      },
      admin: null,
    },
    Cancelled: {
      customer: null,
      admin: {
        title: 'Order cancelled',
        body: `${order.customer?.name} cancelled their order.${order.cancellationReason ? ` Reason: ${order.cancellationReason}` : ''}`,
      },
    },
    Returned: {
      customer: {
        title: 'Return recorded',
        body: order.paymentStatus === PaymentStatus.REFUND_PENDING
          ? `Your return was recorded. ${shopName} will process your refund shortly.`
          : `Your return for order at ${shopName} was recorded.`,
      },
      admin: {
        title: 'Order returned',
        body: `${order.customer?.name} returned an order${order.paymentStatus === PaymentStatus.REFUND_PENDING ? ' — refund required' : ''}`,
      },
    },
    Refunded: {
      customer: {
        title: 'Refund processed',
        body: `${shopName} refunded ₹${order.finalBillAmount} for your returned order.`,
      },
      admin: null,
    },
    Delivered: {
      customer: { title: 'Delivered', body: `Order from ${shopName} marked as delivered` },
      admin: { title: 'Delivery confirmed', body: `Order delivered to ${order.customer?.name}` },
    },
  };

  const cfg = messages[event] || {};
  if (cfg.customer && order.customerId) {
    await sendPushToUser(order.customerId, {
      ...cfg.customer,
      data: { orderId: order.id, screen: 'OrderDetail' },
    });
    if (cfg.customer.body) {
      await notifyOrderStatusFallback(order, event, `Localite: ${cfg.customer.body}`);
    }
  }
  if (cfg.admin && order.shop) {
    const { ShopUser } = await import('../models/index.js');
    const staff = await ShopUser.findAll({ where: { shopId: order.shopId || order.shop.id } });
    for (const s of staff) {
      await sendPushToUser(s.userId, {
        ...cfg.admin,
        data: { orderId: order.id, screen: 'ManageOrder' },
      });
    }
  }
}
