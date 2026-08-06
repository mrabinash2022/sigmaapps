import { Order, OrderEvent } from '../models/index.js';

export async function recordOrderEvent({ orderId, fromStatus, toStatus, actorId, note, transaction }) {
  return OrderEvent.create(
    { orderId, fromStatus, toStatus, actorId, note },
    { transaction }
  );
}

export async function getOrderWithDetails(orderId) {
  return Order.findByPk(orderId, {
    include: [
      { association: 'customer', attributes: ['id', 'name', 'phone', 'address'] },
      { association: 'shop', attributes: ['id', 'name', 'category', 'phone', 'address'] },
      {
        association: 'events',
        include: [{ association: 'actor', attributes: ['id', 'name', 'role'] }],
        order: [['createdAt', 'ASC']],
      },
    ],
  });
}
