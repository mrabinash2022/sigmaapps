import { OrderStatus, OrderType, ShopCategory } from './enums.js';

/** Shop categories that use the visual product catalog by default. */
export const VISUAL_CATALOG_CATEGORIES = [ShopCategory.FLOWERS, ShopCategory.NURSERY];

/** @deprecated Use isVisualCatalogShop */
export const CATALOG_SHOP_CATEGORIES = VISUAL_CATALOG_CATEGORIES;

export function isVisualCatalogShop(shop) {
  if (!shop) return false;
  const enabled = shop.visualCatalogEnabled === true || shop.visual_catalog_enabled === true;
  if (enabled) return true;
  return VISUAL_CATALOG_CATEGORIES.includes(shop.category);
}

/** @deprecated Use isVisualCatalogShop */
export function isCatalogShop(categoryOrShop) {
  if (typeof categoryOrShop === 'string') {
    return VISUAL_CATALOG_CATEGORIES.includes(categoryOrShop);
  }
  return isVisualCatalogShop(categoryOrShop);
}

/**
 * Product group definitions per shop category.
 * itemGroup keys map to ShopCatalogItem.item_group in the database.
 */
export const VISUAL_CATALOG_GROUPS = {
  [ShopCategory.FLOWERS]: [
    { key: 'flowers', label: 'Flowers', emoji: '🌸' },
    { key: 'malas', label: 'Flower Malas', emoji: '📿' },
    { key: 'pooja_items', label: 'Pooja Items', emoji: '🪔' },
    { key: 'agarbatti', label: 'Agarbatti', emoji: '🧘' },
    { key: 'god_cloths', label: 'God Cloths', emoji: '🧣' },
  ],
  [ShopCategory.NURSERY]: [
    { key: 'plants', label: 'Plants', emoji: '🌿' },
    { key: 'pots', label: 'Pots & Gamla', emoji: '🪴' },
    { key: 'fertilizers', label: 'Fertilizers', emoji: '🧪' },
    { key: 'soil', label: 'Soil & Mix', emoji: '🪣' },
    { key: 'seeds', label: 'Seeds', emoji: '🌱' },
    { key: 'gardening', label: 'Gardening Items', emoji: '🧰' },
  ],
  [ShopCategory.SWEETS]: [
    { key: 'sweets', label: 'Sweets', emoji: '🍬' },
    { key: 'namkeen', label: 'Namkeen', emoji: '🥨' },
    { key: 'gift_packs', label: 'Gift Packs', emoji: '🎁' },
  ],
  [ShopCategory.GROCERY]: [
    { key: 'staples', label: 'Staples', emoji: '🌾' },
    { key: 'snacks', label: 'Snacks', emoji: '🍿' },
    { key: 'household', label: 'Household', emoji: '🧴' },
  ],
  [ShopCategory.BAKERY]: [
    { key: 'bread', label: 'Bread', emoji: '🍞' },
    { key: 'cakes', label: 'Cakes', emoji: '🎂' },
    { key: 'pastries', label: 'Pastries', emoji: '🥐' },
  ],
  [ShopCategory.VEGETABLES]: [
    { key: 'vegetables', label: 'Vegetables', emoji: '🥬' },
    { key: 'fruits', label: 'Fruits', emoji: '🍎' },
  ],
  [ShopCategory.MEDICINES]: [
    { key: 'otc', label: 'OTC', emoji: '💊' },
    { key: 'wellness', label: 'Wellness', emoji: '🩺' },
  ],
};

/** @deprecated Use VISUAL_CATALOG_GROUPS */
export const CATALOG_GROUPS = VISUAL_CATALOG_GROUPS;

export const VISUAL_CATALOG_THEMES = {
  [ShopCategory.FLOWERS]: {
    accent: '#db2777',
    light: '#fdf2f8',
    label: 'Browse flowers, malas & pooja items with prices',
  },
  [ShopCategory.NURSERY]: {
    accent: '#15803d',
    light: '#f0fdf4',
    label: 'Browse plants, gamla, seeds & garden supplies',
  },
  [ShopCategory.SWEETS]: {
    accent: '#f59e0b',
    light: '#fffbeb',
    label: 'Browse sweets & namkeen with prices',
  },
  [ShopCategory.GROCERY]: {
    accent: '#8b5cf6',
    light: '#f5f3ff',
    label: 'Browse grocery items with prices',
  },
  [ShopCategory.BAKERY]: {
    accent: '#f97316',
    light: '#fff7ed',
    label: 'Browse bakery items with prices',
  },
  [ShopCategory.VEGETABLES]: {
    accent: '#22c55e',
    light: '#f0fdf4',
    label: 'Browse fresh produce with prices',
  },
  [ShopCategory.MEDICINES]: {
    accent: '#3b82f6',
    light: '#eff6ff',
    label: 'Browse wellness items with prices',
  },
  default: {
    accent: '#1a7f4b',
    light: '#e8f5ee',
    label: 'Browse items with images and prices',
  },
};

export function getVisualCatalogTheme(category) {
  return VISUAL_CATALOG_THEMES[category] || VISUAL_CATALOG_THEMES.default;
}

export function getCatalogGroups(category) {
  return VISUAL_CATALOG_GROUPS[category] || [];
}

/** True when a shop should use the visual catalog order screen (category default, flag, or has catalog items). */
export function shopHasVisualCatalog(shop) {
  if (isVisualCatalogShop(shop)) return true;
  const count = shop?.catalogItemCount ?? shop?.catalog_item_count ?? 0;
  return Number(count) > 0;
}

export function getCatalogGroupLabel(category, groupKey) {
  const group = getCatalogGroups(category).find((g) => g.key === groupKey);
  return group?.label || groupKey;
}

export function parseCatalogPayload(order) {
  if (!order) return null;
  const raw = order.catalogPayload ?? order.catalog_payload;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function splitTextLines(text) {
  if (!text?.trim()) return [];
  return text.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function extractLegacyExtraText(textPayload) {
  if (!textPayload) return [];
  const marker = '── Additional items (text) ──';
  const idx = textPayload.indexOf(marker);
  if (idx === -1) return [];
  const after = textPayload.slice(idx + marker.length).trim();
  const noteIdx = after.indexOf('Note:');
  const block = (noteIdx === -1 ? after : after.slice(0, noteIdx)).trim();
  return splitTextLines(block);
}

function extractLegacyNote(textPayload) {
  if (!textPayload) return null;
  const idx = textPayload.indexOf('Note:');
  if (idx === -1) return null;
  return textPayload.slice(idx + 5).trim() || null;
}

/** Build structured payload stored on Orders.catalog_payload for all order sources. */
export function buildVisualOrderPayload({
  catalogItems = [],
  extraText = '',
  imageUrl = null,
  note = null,
}) {
  const items = catalogItems || [];
  const textLines = splitTextLines(extraText);
  const estimatedTotal = items.length
    ? items.reduce(
      (sum, item) => sum + Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0)),
      0,
    )
    : null;

  return {
    items,
    textLines,
    imageUrl: imageUrl || null,
    note: note?.trim() || null,
    estimatedTotal: Number.isFinite(estimatedTotal) ? estimatedTotal : null,
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) + textLines.length + (imageUrl ? 1 : 0),
  };
}

/**
 * Unified list of everything the customer ordered — catalog picks, typed lines, and photo.
 * @returns {Array<{ kind: 'catalog'|'text'|'image'|'note', key: string, ... }>}
 */
export function getOrderItemsList(order) {
  const payload = parseCatalogPayload(order);
  const entries = [];

  if (payload?.items?.length) {
    payload.items.forEach((item, idx) => {
      entries.push({
        kind: 'catalog',
        key: item.catalogItemId || `catalog-${idx}`,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sizeLabel: item.sizeLabel,
        imageUrl: item.imageUrl,
        lineTotal: item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0),
      });
    });
  }

  if (Array.isArray(payload?.textLines) && payload.textLines.length) {
    payload.textLines.forEach((text, idx) => {
      entries.push({ kind: 'text', key: `text-${idx}`, text });
    });
  } else {
    const legacyExtra = extractLegacyExtraText(order?.textPayload);
    if (legacyExtra.length) {
      legacyExtra.forEach((text, idx) => {
        entries.push({ kind: 'text', key: `text-legacy-${idx}`, text });
      });
    } else if (!payload?.items?.length && order?.textPayload?.trim()) {
      splitTextLines(order.textPayload).forEach((text, idx) => {
        entries.push({ kind: 'text', key: `text-flex-${idx}`, text });
      });
    }
  }

  const imageUrl = payload?.imageUrl || order?.imagePayloadUrl;
  if (imageUrl) {
    entries.push({
      kind: 'image',
      key: 'image',
      imageUrl,
      label: 'Handwritten list (photo)',
    });
  }

  const note = payload?.note || extractLegacyNote(order?.textPayload);
  if (note) {
    entries.push({ kind: 'note', key: 'note', text: note });
  }

  return entries;
}

export function hasOrderItemsList(order) {
  return getOrderItemsList(order).length > 0;
}

export function formatCatalogPayloadSummary(payload) {
  if (!payload) return '';
  const parts = [];
  if (payload.items?.length) {
    parts.push(
      ...payload.items.map((item) => {
        const size = item.sizeLabel ? ` (${item.sizeLabel})` : '';
        return `${item.quantity}× ${item.name}${size}`;
      }),
    );
  }
  if (payload.textLines?.length) {
    parts.push(...payload.textLines);
  }
  if (payload.imageUrl) {
    parts.push('Handwritten list (photo)');
  }
  return parts.join(', ');
}

export function formatOrderItemsSummary(order) {
  const entries = getOrderItemsList(order).filter((e) => e.kind !== 'note');
  if (!entries.length) return '';
  return entries.map((entry) => {
    if (entry.kind === 'catalog') {
      const size = entry.sizeLabel ? ` (${entry.sizeLabel})` : '';
      return `${entry.quantity}× ${entry.name}${size}`;
    }
    if (entry.kind === 'text') return entry.text;
    if (entry.kind === 'image') return entry.label || 'Handwritten list (photo)';
    return '';
  }).filter(Boolean).join(', ');
}

export function getCatalogEstimatedTotal(payload) {
  if (!payload) return null;
  if (payload.estimatedTotal != null) return payload.estimatedTotal;
  if (!payload?.items?.length) return null;
  const total = payload.items.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0,
  );
  return Number.isFinite(total) ? total : null;
}

export function isCatalogOrder(order) {
  if (order?.orderType === OrderType.CATALOG) return true;
  const payload = parseCatalogPayload(order);
  if (!payload) return false;
  return Boolean(
    payload.items?.length
    || payload.textLines?.length
    || payload.imageUrl,
  );
}

export function isVisualCatalogOrder(order) {
  return isCatalogOrder(order);
}

/** Read order status regardless of API camelCase / snake_case field naming. */
export function getOrderStatus(order) {
  return order?.orderStatus ?? order?.order_status ?? null;
}

export function isDeliveredOrder(order) {
  return getOrderStatus(order) === OrderStatus.DELIVERED;
}

function hasFulfillmentReorderContent(order) {
  const raw = order?.fulfillmentPayload ?? order?.fulfillment_payload;
  if (!raw || typeof raw !== 'object') return false;
  return (raw.lines || []).some((line) => Number(line.quantityFulfilled) > 0);
}

/** Delivered orders with item content can be reordered by the customer. */
export function canReorderOrder(order) {
  if (!order || !isDeliveredOrder(order)) return false;
  if (hasOrderItemsList(order)) return true;
  if (hasFulfillmentReorderContent(order)) return true;
  return Boolean(
    order.textPayload?.trim()
    || order.imagePayloadUrl
    || order.image_payload_url
    || parseCatalogPayload(order)?.items?.length,
  );
}
