import { ORDER_TRANSITIONS, OrderStatus, PaymentMethod, PaymentStatus } from '@localite/shared';

export class OrderStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OrderStateError';
    this.statusCode = 400;
  }
}

export function assertTransition(currentStatus, nextStatus) {
  const allowed = ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new OrderStateError(
      `Cannot transition from "${currentStatus}" to "${nextStatus}". Allowed: ${allowed.join(', ') || 'none'}`
    );
  }
}

export function canShip(order) {
  if (!order.paymentMethod) {
    throw new OrderStateError('Payment method must be selected before shipping');
  }
  if (order.paymentMethod === PaymentMethod.UPI_INSTANT && order.paymentStatus !== PaymentStatus.PAID) {
    throw new OrderStateError('UPI payment must be completed before shipping');
  }
  return true;
}

export function validateAcceptPayload({ finalBillAmount, deliveryTimeWindow }) {
  if (finalBillAmount == null || Number(finalBillAmount) <= 0) {
    throw new OrderStateError('finalBillAmount must be a positive number');
  }
  if (!deliveryTimeWindow?.trim()) {
    throw new OrderStateError('deliveryTimeWindow is required');
  }
}

export { OrderStatus };
