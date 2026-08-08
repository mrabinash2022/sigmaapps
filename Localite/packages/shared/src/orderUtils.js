import { OrderStatus, PaymentStatus } from './enums.js';

const ACTIVE_STATUSES = new Set([
  OrderStatus.CREATED,
  OrderStatus.ACCEPTED,
  OrderStatus.SHIPPED,
  OrderStatus.BACKORDER_WAITING,
]);

const TERMINAL_STATUSES = new Set([
  OrderStatus.DELIVERED,
  OrderStatus.REJECTED,
  OrderStatus.RETURNED,
  OrderStatus.CANCELLED,
]);

export function isActiveOrderStatus(status) {
  return ACTIVE_STATUSES.has(status);
}

export function isTerminalOrderStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

export function canCustomerCancelOrder(order) {
  const status = order?.orderStatus ?? order?.order_status;
  if (status === OrderStatus.CREATED) return true;
  if (status === OrderStatus.ACCEPTED) {
    return order.paymentStatus === PaymentStatus.PENDING;
  }
  return false;
}
