import { Expo } from 'expo-server-sdk';
import { UserDevice } from '../models/index.js';

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
    Shipped: {
      customer: { title: 'On the way', body: `Your order from ${shopName} has been shipped` },
      admin: null,
    },
    Delivered: {
      customer: { title: 'Delivered', body: `Order from ${shopName} marked as delivered` },
      admin: { title: 'Delivery confirmed', body: `Order delivered to ${order.customer?.name}` },
    },
  };

  const cfg = messages[event] || {};
  if (cfg.customer && order.customerId) {
    await sendPushToUser(order.customerId, cfg.customer);
  }
  if (cfg.admin && order.shop) {
    const { ShopUser } = await import('../models/index.js');
    const staff = await ShopUser.findAll({ where: { shopId: order.shopId || order.shop.id } });
    for (const s of staff) {
      await sendPushToUser(s.userId, cfg.admin);
    }
  }
}
