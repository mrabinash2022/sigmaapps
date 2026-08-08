import { OrderStatus, PaymentStatus } from '@localite/shared';

function matchReturnedRefundPending(order) {
  return order.orderStatus === OrderStatus.RETURNED
    && order.paymentStatus === PaymentStatus.REFUND_PENDING;
}

function matchCompleted(order) {
  if (matchReturnedRefundPending(order)) return false;
  return [
    OrderStatus.DELIVERED,
    OrderStatus.REJECTED,
    OrderStatus.RETURNED,
    OrderStatus.CANCELLED,
  ].includes(order.orderStatus);
}

export const QUEUE_SECTIONS = [
  {
    key: 'waiting',
    title: 'Waiting for you',
    subtitle: 'New orders — work oldest first',
    match: (order) => order.orderStatus === OrderStatus.CREATED,
    showPosition: true,
  },
  {
    key: 'backorder',
    title: 'Backorder — waiting for stock',
    subtitle: 'Missing items from earlier orders — activate when available',
    match: (order) => order.orderStatus === OrderStatus.BACKORDER_WAITING,
    showPosition: true,
  },
  {
    key: 'preparing',
    title: 'Preparing',
    subtitle: 'Accepted — awaiting payment or dispatch',
    match: (order) => order.orderStatus === OrderStatus.ACCEPTED,
    showPosition: true,
  },
  {
    key: 'delivery',
    title: 'Out for delivery',
    subtitle: 'Shipped — awaiting customer confirmation',
    match: (order) => order.orderStatus === OrderStatus.SHIPPED,
    showPosition: false,
  },
  {
    key: 'returns',
    title: 'Returns — refund due',
    subtitle: 'Customer returned a paid order — process refund to customer',
    match: matchReturnedRefundPending,
    showPosition: true,
  },
  {
    key: 'done',
    title: 'Completed',
    subtitle: 'Delivered, rejected, or returned',
    match: matchCompleted,
    showPosition: false,
  },
];

const STATUS_PRIORITY = {
  [OrderStatus.CREATED]: 1,
  [OrderStatus.BACKORDER_WAITING]: 2,
  [OrderStatus.ACCEPTED]: 3,
  [OrderStatus.SHIPPED]: 4,
  [OrderStatus.RETURNED]: 5,
  [OrderStatus.DELIVERED]: 6,
  [OrderStatus.REJECTED]: 7,
  [OrderStatus.CANCELLED]: 8,
};

/** Sort orders for shop queue: status priority, then oldest first within each group. */
export function sortOrdersForQueue(orders) {
  return [...orders].sort((a, b) => {
    const aRefund = matchReturnedRefundPending(a) ? 3.5 : STATUS_PRIORITY[a.orderStatus] ?? 99;
    const bRefund = matchReturnedRefundPending(b) ? 3.5 : STATUS_PRIORITY[b.orderStatus] ?? 99;
    const statusDiff = aRefund - bRefund;
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

export function buildOrderQueueSections(orders, { includeCompleted = true } = {}) {
  const sorted = sortOrdersForQueue(orders);
  const sections = QUEUE_SECTIONS
    .filter((section) => includeCompleted || section.key !== 'done')
    .map((section) => {
      const data = sorted.filter(section.match);
      return { ...section, data };
    })
    .filter((section) => section.data.length > 0);

  return sections;
}

export function getQueueSummary(orders) {
  const waiting = orders.filter((o) => o.orderStatus === OrderStatus.CREATED).length;
  const backorder = orders.filter((o) => o.orderStatus === OrderStatus.BACKORDER_WAITING).length;
  const preparing = orders.filter((o) => o.orderStatus === OrderStatus.ACCEPTED).length;
  const delivery = orders.filter((o) => o.orderStatus === OrderStatus.SHIPPED).length;
  const returns = orders.filter(matchReturnedRefundPending).length;

  return {
    waiting,
    backorder,
    preparing,
    delivery,
    returns,
    active: waiting + backorder + preparing + delivery + returns,
  };
}

export function formatOrderTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 24 * 60) {
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ago`;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
