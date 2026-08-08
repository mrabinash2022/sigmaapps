import { OrderStatus } from './enums.js';
import { getOrderItemsList, parseCatalogPayload, getCatalogEstimatedTotal } from './catalogUtils.js';

export const FulfillmentLineStatus = {
  FULFILLED: 'fulfilled',
  UNAVAILABLE: 'unavailable',
  PARTIAL: 'partial',
};

/** Build editable fulfillment lines from an order for shopkeeper review. */
export function buildFulfillmentLinesFromOrder(order) {
  const entries = getOrderItemsList(order).filter((e) => e.kind !== 'note');
  const note = parseCatalogPayload(order)?.note
    || (order?.textPayload?.includes('Note:')
      ? order.textPayload.slice(order.textPayload.indexOf('Note:') + 5).trim()
      : null);

  const lines = entries.map((entry) => {
    if (entry.kind === 'catalog') {
      return {
        key: entry.key,
        kind: 'catalog',
        name: entry.name,
        catalogItemId: entry.catalogItemId,
        quantityRequested: entry.quantity,
        quantityFulfilled: entry.quantity,
        unitPrice: Number(entry.unitPrice),
        sizeLabel: entry.sizeLabel || null,
        imageUrl: entry.imageUrl || null,
        status: FulfillmentLineStatus.FULFILLED,
        unavailableReason: null,
      };
    }
    if (entry.kind === 'text') {
      return {
        key: entry.key,
        kind: 'text',
        name: entry.text,
        text: entry.text,
        quantityRequested: 1,
        quantityFulfilled: 1,
        status: FulfillmentLineStatus.FULFILLED,
        unavailableReason: null,
      };
    }
    return {
      key: entry.key,
      kind: 'image',
      name: entry.label || 'Handwritten list (photo)',
      imageUrl: entry.imageUrl,
      quantityRequested: 1,
      quantityFulfilled: 1,
      status: FulfillmentLineStatus.FULFILLED,
      unavailableReason: null,
    };
  });

  return { lines, note };
}

export function normalizeFulfillmentInput(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((line) => {
    const quantityRequested = Number(line.quantityRequested ?? line.quantity ?? 1);
    const quantityFulfilled = Math.max(
      0,
      Math.min(Number(line.quantityFulfilled ?? quantityRequested), quantityRequested),
    );
    let status = line.status || FulfillmentLineStatus.FULFILLED;
    if (quantityFulfilled === 0) status = FulfillmentLineStatus.UNAVAILABLE;
    else if (quantityFulfilled < quantityRequested) status = FulfillmentLineStatus.PARTIAL;
    else status = FulfillmentLineStatus.FULFILLED;

    return {
      ...line,
      quantityRequested,
      quantityFulfilled,
      status,
      unavailableReason: line.unavailableReason?.trim() || null,
    };
  });
}

export function getUnavailableLines(lines) {
  return (lines || []).filter(
    (l) => l.status === FulfillmentLineStatus.UNAVAILABLE
      || l.status === FulfillmentLineStatus.PARTIAL,
  );
}

export function getFulfilledLines(lines) {
  return (lines || []).filter((l) => l.quantityFulfilled > 0);
}

export function computeCatalogFulfillmentTotal(lines) {
  return (lines || []).reduce((sum, line) => {
    if (line.kind !== 'catalog' || !line.quantityFulfilled) return sum;
    return sum + Number(line.unitPrice || 0) * Number(line.quantityFulfilled);
  }, 0);
}

export function buildFulfillmentPayload({ lines, shopNote, finalBillAmount }) {
  const unavailable = getUnavailableLines(lines);
  const fulfilled = getFulfilledLines(lines);
  const catalogSubtotal = computeCatalogFulfillmentTotal(lines);

  return {
    lines,
    fulfilledCount: fulfilled.length,
    unavailableCount: unavailable.length,
    catalogSubtotal: Number.isFinite(catalogSubtotal) ? catalogSubtotal : null,
    shopNote: shopNote?.trim() || null,
    finalBillAmount: finalBillAmount != null ? Number(finalBillAmount) : null,
    unavailableSummary: unavailable.map((l) => {
      if (l.kind === 'catalog') {
        const missing = l.quantityRequested - l.quantityFulfilled;
        return `${missing}× ${l.name}${l.unavailableReason ? ` (${l.unavailableReason})` : ''}`;
      }
      return `${l.name}${l.unavailableReason ? ` — ${l.unavailableReason}` : ''}`;
    }),
  };
}

export function parseFulfillmentPayload(order) {
  const raw = order?.fulfillmentPayload ?? order?.fulfillment_payload;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasUnavailableItems(order) {
  const payload = parseFulfillmentPayload(order);
  return (payload?.unavailableCount || 0) > 0;
}

export function isBackorderWaiting(order) {
  return order?.orderStatus === OrderStatus.BACKORDER_WAITING;
}

export function formatFulfillmentSummary(order) {
  const payload = parseFulfillmentPayload(order);
  if (!payload?.unavailableSummary?.length) return null;
  return payload.unavailableSummary.join(', ');
}

/** Merge original order lines with shopkeeper fulfillment adjustments for display. */
export function getOrderDisplayItems(order) {
  const entries = getOrderItemsList(order).filter((e) => e.kind !== 'note');
  const payload = parseFulfillmentPayload(order);

  if (!payload?.lines?.length) {
    return entries.map((entry) => ({
      ...entry,
      quantityRequested: entry.kind === 'catalog' ? entry.quantity : 1,
      quantityFulfilled: entry.kind === 'catalog' ? entry.quantity : 1,
      isUnavailable: false,
      isPartial: false,
      displayStatus: FulfillmentLineStatus.FULFILLED,
      unavailableReason: null,
      originalLineTotal: entry.lineTotal,
    }));
  }

  const lineByKey = Object.fromEntries(payload.lines.map((line) => [line.key, line]));

  return entries.map((entry) => {
    const line = lineByKey[entry.key];
    if (!line) {
      return {
        ...entry,
        quantityRequested: entry.kind === 'catalog' ? entry.quantity : 1,
        quantityFulfilled: entry.kind === 'catalog' ? entry.quantity : 1,
        isUnavailable: false,
        isPartial: false,
        displayStatus: FulfillmentLineStatus.FULFILLED,
        unavailableReason: null,
        originalLineTotal: entry.lineTotal,
      };
    }

    const isUnavailable = line.status === FulfillmentLineStatus.UNAVAILABLE;
    const isPartial = line.status === FulfillmentLineStatus.PARTIAL;
    const quantityFulfilled = line.quantityFulfilled ?? 0;
    const quantityRequested = line.quantityRequested
      ?? (entry.kind === 'catalog' ? entry.quantity : 1);

    return {
      ...entry,
      name: line.name || entry.name || entry.text,
      quantityRequested,
      quantityFulfilled,
      isUnavailable,
      isPartial,
      displayStatus: line.status,
      unavailableReason: line.unavailableReason,
      originalLineTotal: entry.lineTotal,
      lineTotal: entry.kind === 'catalog'
        ? Number(line.unitPrice || entry.unitPrice || 0) * quantityFulfilled
        : entry.lineTotal,
    };
  });
}

export function getOrderDisplayTotals(order) {
  const payload = parseFulfillmentPayload(order);
  const catalog = parseCatalogPayload(order);
  const originalEstimate = getCatalogEstimatedTotal(catalog);

  if (payload?.lines?.length) {
    const fulfilledSubtotal = payload.catalogSubtotal != null
      ? Number(payload.catalogSubtotal)
      : computeCatalogFulfillmentTotal(payload.lines);
    return {
      originalEstimate,
      fulfilledSubtotal: Number.isFinite(fulfilledSubtotal) ? fulfilledSubtotal : null,
      finalBillAmount: order?.finalBillAmount != null ? Number(order.finalBillAmount) : null,
      hasAdjustments: (payload.unavailableCount || 0) > 0,
    };
  }

  return {
    originalEstimate,
    fulfilledSubtotal: originalEstimate,
    finalBillAmount: order?.finalBillAmount != null ? Number(order.finalBillAmount) : null,
    hasAdjustments: false,
  };
}
