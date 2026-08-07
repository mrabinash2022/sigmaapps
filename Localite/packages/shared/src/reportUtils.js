import { OrderStatus } from './enums.js';
import { formatOrderItemsSummary, getOrderStatus } from './catalogUtils.js';

export const REPORT_PRESETS = {
  day: { label: 'Today', days: 1 },
  week: { label: 'Last 7 days', days: 7 },
  month: { label: 'Last 30 days', days: 30 },
  quarter: { label: 'Last 3 months', days: 90 },
  custom: { label: 'Custom range', days: null },
};

const AMOUNT_NA_STATUSES = new Set([
  OrderStatus.REJECTED,
  OrderStatus.RETURNED,
]);

export function resolveReportDateRange({ preset = 'week', from, to } = {}) {
  const presetKey = REPORT_PRESETS[preset] ? preset : 'week';

  if (presetKey === 'custom') {
    if (!from || !to) {
      const err = new Error('from and to dates are required for custom range (YYYY-MM-DD)');
      err.statusCode = 400;
      throw err;
    }
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const err = new Error('Invalid date format. Use YYYY-MM-DD');
      err.statusCode = 400;
      throw err;
    }
    if (start > end) {
      const err = new Error('Start date must be on or before end date');
      err.statusCode = 400;
      throw err;
    }
    return {
      preset: presetKey,
      from: start.toISOString(),
      to: end.toISOString(),
      fromDate: from,
      toDate: to,
    };
  }

  const days = REPORT_PRESETS[presetKey].days;
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  return {
    preset: presetKey,
    from: start.toISOString(),
    to: end.toISOString(),
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10),
  };
}

export function formatReportAmount(order) {
  const status = getOrderStatus(order);
  if (AMOUNT_NA_STATUSES.has(status)) {
    return 'N/A';
  }
  const raw = order.finalBillAmount ?? order.final_bill_amount;
  if (raw == null || raw === '') return '—';
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : '—';
}

export function formatReportPaymentStatus(order) {
  const status = order.paymentStatus ?? order.payment_status;
  if (!status) return '—';
  return String(status).replace(/_/g, ' ');
}

export function buildReportRow(order) {
  const shop = order.shop || {};
  const createdAt = order.createdAt || order.created_at;
  const date = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : '—';
  const items = formatOrderItemsSummary(order) || order.textPayload?.trim() || '—';

  return {
    shopName: shop.name || '—',
    shopNumber: shop.shopCode || shop.shop_code || '—',
    date,
    items,
    orderStatus: getOrderStatus(order) || '—',
    paymentStatus: formatReportPaymentStatus(order),
    totalAmount: formatReportAmount(order),
  };
}

export const REPORT_COLUMNS = [
  { key: 'shopName', header: 'Shop Name' },
  { key: 'shopNumber', header: 'Shop Number' },
  { key: 'date', header: 'Date' },
  { key: 'items', header: 'Items' },
  { key: 'orderStatus', header: 'Order Status' },
  { key: 'paymentStatus', header: 'Payment Status' },
  { key: 'totalAmount', header: 'Total Amount' },
];
