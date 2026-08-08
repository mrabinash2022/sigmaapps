import { Shop, ShopCatalogItem } from '../models/index.js';
import { CatalogPublishStatus, getCatalogGroups, isVisualCatalogShop } from '@localite/shared';
import { buildVisualOrderPayload } from '@localite/shared';
import { invalidateShopCatalogCache } from './cacheService.js';

export function isCatalogItemInStock(item) {
  if (!item?.isAvailable) return false;
  if (item.trackStock && item.stockQuantity != null && Number(item.stockQuantity) <= 0) {
    return false;
  }
  return true;
}

export function assertCatalogStock(dbItem, requestedQty) {
  if (!isCatalogItemInStock(dbItem)) {
    const err = new Error(`${dbItem.name} is out of stock`);
    err.statusCode = 400;
    throw err;
  }
  if (dbItem.trackStock && dbItem.stockQuantity != null && requestedQty > Number(dbItem.stockQuantity)) {
    const err = new Error(`Only ${dbItem.stockQuantity} of ${dbItem.name} available`);
    err.statusCode = 400;
    throw err;
  }
}

export async function applyFulfillmentStockAdjustments(fulfillmentLines) {
  for (const line of fulfillmentLines || []) {
    if (line.kind !== 'catalog' || !line.catalogItemId) continue;

    const item = await ShopCatalogItem.findByPk(line.catalogItemId);
    if (!item) continue;

    const fulfilled = Number(line.quantityFulfilled || 0);
    const updates = {};

    if (item.trackStock && item.stockQuantity != null) {
      const nextQty = Math.max(0, Number(item.stockQuantity) - fulfilled);
      updates.stockQuantity = nextQty;
      if (nextQty <= 0) updates.isAvailable = false;
    } else if (line.status === 'unavailable') {
      updates.isAvailable = false;
    }

    if (Object.keys(updates).length) {
      await item.update(updates);
      invalidateShopCatalogCache(item.shopId);
    }
  }
}

const PUBLIC_CATALOG_WHERE = {
  isAvailable: true,
  publishStatus: CatalogPublishStatus.PUBLISHED,
};

export async function syncShopVisualCatalogFlag(shopId) {
  const publishedCount = await ShopCatalogItem.count({
    where: { shopId, ...PUBLIC_CATALOG_WHERE },
  });
  await Shop.update(
    { visualCatalogEnabled: publishedCount > 0 },
    { where: { id: shopId } },
  );
  return publishedCount > 0;
}

export async function shopSupportsVisualCatalog(shop) {
  if (isVisualCatalogShop(shop)) return true;
  const count = await ShopCatalogItem.count({ where: { shopId: shop.id, ...PUBLIC_CATALOG_WHERE } });
  return count > 0;
}

export async function getShopCatalog(shop) {
  const items = await ShopCatalogItem.findAll({
    where: { shopId: shop.id, ...PUBLIC_CATALOG_WHERE },
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  }).then((rows) => rows.filter(isCatalogItemInStock));

  if (!items.length && !(await shopSupportsVisualCatalog(shop))) {
    return { groups: [], items: [] };
  }

  const groupDefs = getCatalogGroups(shop.category);
  const knownKeys = new Set(groupDefs.map((g) => g.key));
  const extraGroups = [...new Set(items.map((i) => i.itemGroup).filter((k) => !knownKeys.has(k)))]
    .map((key) => ({ key, label: key.replace(/_/g, ' '), emoji: '📦' }));

  const allGroups = [...groupDefs, ...extraGroups];
  const groups = allGroups
    .map((group) => ({
      ...group,
      items: items.filter((item) => item.itemGroup === group.key),
    }))
    .filter((group) => group.items.length > 0);

  return { groups, items, visualCatalogEnabled: await shopSupportsVisualCatalog(shop) };
}

export async function getShopCatalogForOwner(shop) {
  const items = await ShopCatalogItem.findAll({
    where: { shopId: shop.id },
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });

  const groupDefs = getCatalogGroups(shop.category);
  const knownKeys = new Set(groupDefs.map((g) => g.key));
  const extraGroups = [...new Set(items.map((i) => i.itemGroup).filter((k) => !knownKeys.has(k)))]
    .map((key) => ({ key, label: key.replace(/_/g, ' '), emoji: '📦' }));

  const groups = [...groupDefs, ...extraGroups].map((group) => ({
    ...group,
    items: items.filter((item) => item.itemGroup === group.key),
  })).filter((group) => group.items.length > 0);

  const publishedCount = items.filter((i) => i.publishStatus === CatalogPublishStatus.PUBLISHED && i.isAvailable).length;
  const draftCount = items.filter((i) => i.publishStatus === CatalogPublishStatus.DRAFT).length;

  return {
    shop: {
      id: shop.id,
      name: shop.name,
      category: shop.category,
      visualCatalogEnabled: shop.visualCatalogEnabled,
    },
    items,
    groups,
    publishedCount,
    draftCount,
  };
}

function parseCatalogItemBody(body) {
  const price = Number(body.price);
  if (!body.name?.trim()) {
    const err = new Error('Product name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!body.itemGroup?.trim()) {
    const err = new Error('Product category (itemGroup) is required');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(price) || price < 0) {
    const err = new Error('Valid price is required');
    err.statusCode = 400;
    throw err;
  }
  return {
    name: body.name.trim(),
    itemGroup: body.itemGroup.trim(),
    description: body.description?.trim() || null,
    price,
    sizeLabel: body.sizeLabel?.trim() || null,
    unit: body.unit?.trim() || 'piece',
    sortOrder: Number(body.sortOrder) || 0,
    trackStock: body.trackStock === 'true' || body.trackStock === true,
    stockQuantity: (body.trackStock === 'true' || body.trackStock === true)
      ? Math.max(0, Number(body.stockQuantity) || 0)
      : null,
  };
}

export async function createCatalogItem(shopId, body, imageUrl = null) {
  const fields = parseCatalogItemBody(body);
  const publish = body.publish === 'true' || body.publish === true;
  const item = await ShopCatalogItem.create({
    shopId,
    ...fields,
    imageUrl,
    publishStatus: publish ? CatalogPublishStatus.PUBLISHED : CatalogPublishStatus.DRAFT,
    isAvailable: true,
  });
  if (publish) await syncShopVisualCatalogFlag(shopId);
  invalidateShopCatalogCache(shopId);
  return item;
}

export async function updateCatalogItem(item, body, imageUrl) {
  const fields = parseCatalogItemBody(body);
  const updates = { ...fields };
  if (imageUrl) updates.imageUrl = imageUrl;
  await item.update(updates);
  await syncShopVisualCatalogFlag(item.shopId);
  invalidateShopCatalogCache(item.shopId);
  return item;
}

export async function setCatalogItemPublishStatus(item, publishStatus) {
  await item.update({ publishStatus, isAvailable: true });
  await syncShopVisualCatalogFlag(item.shopId);
  invalidateShopCatalogCache(item.shopId);
  return item;
}

export async function deleteCatalogItem(item) {
  const shopId = item.shopId;
  await item.destroy();
  await syncShopVisualCatalogFlag(shopId);
  invalidateShopCatalogCache(shopId);
}

export function normalizeCartItems(items) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.map((item) => {
    const quantity = Number(item.quantity);
    if (!item.catalogItemId || !item.name || !quantity || quantity < 1) {
      const err = new Error('Each cart item needs catalogItemId, name, and quantity');
      err.statusCode = 400;
      throw err;
    }
    return {
      catalogItemId: item.catalogItemId,
      name: String(item.name).trim(),
      quantity,
      unitPrice: Number(item.unitPrice || 0),
      sizeLabel: item.sizeLabel || null,
      unit: item.unit || 'piece',
      imageUrl: item.imageUrl || null,
    };
  });
}

export async function buildCatalogOrderPayload(shopId, cartItems) {
  const normalized = normalizeCartItems(cartItems);
  if (!normalized.length) {
    return { items: [], estimatedTotal: 0, itemCount: 0 };
  }

  const catalogItemIds = normalized.map((item) => item.catalogItemId);
  const dbItems = await ShopCatalogItem.findAll({
    where: { shopId, id: catalogItemIds, isAvailable: true, publishStatus: CatalogPublishStatus.PUBLISHED },
  });
  const itemMap = new Map(dbItems.map((item) => [item.id, item]));

  const resolved = normalized.map((cartItem) => {
    const dbItem = itemMap.get(cartItem.catalogItemId);
    if (!dbItem) {
      const err = new Error(`Catalog item not available: ${cartItem.name}`);
      err.statusCode = 400;
      throw err;
    }
    assertCatalogStock(dbItem, cartItem.quantity);
    return {
      catalogItemId: dbItem.id,
      name: dbItem.name,
      quantity: cartItem.quantity,
      unitPrice: Number(dbItem.price),
      sizeLabel: dbItem.sizeLabel,
      unit: dbItem.unit,
      imageUrl: dbItem.imageUrl,
      lineTotal: Number(dbItem.price) * cartItem.quantity,
    };
  });

  const estimatedTotal = resolved.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    items: resolved,
    estimatedTotal,
    itemCount: resolved.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function assertVisualOrderHasContent({ catalogPayload, textPayload, imagePayloadUrl }) {
  const hasCatalog = catalogPayload?.items?.length > 0;
  const hasText = Boolean(textPayload?.trim());
  const hasImage = Boolean(imagePayloadUrl);
  if (!hasCatalog && !hasText && !hasImage) {
    const err = new Error('Add catalog items, type a list, or upload a photo to place your order');
    err.statusCode = 400;
    throw err;
  }
}

export function buildVisualOrderText({ catalogPayload, extraText, note }) {
  const parts = [];
  if (catalogPayload?.items?.length) {
    parts.push('── Selected from catalog ──');
    catalogPayload.items.forEach((item) => {
      parts.push(
        `${item.quantity}× ${item.name}${item.sizeLabel ? ` (${item.sizeLabel})` : ''} — ₹${item.lineTotal}`,
      );
    });
    if (catalogPayload.estimatedTotal != null) {
      parts.push(`Catalog estimate: ₹${catalogPayload.estimatedTotal}`);
    }
  }
  if (catalogPayload?.textLines?.length) {
    parts.push('── Additional items (text) ──');
    parts.push(...catalogPayload.textLines);
  } else if (extraText?.trim()) {
    parts.push('── Additional items (text) ──');
    parts.push(extraText.trim());
  }
  if (catalogPayload?.imageUrl) {
    parts.push('── Handwritten list (photo attached) ──');
  }
  const deliveryNote = note?.trim() || catalogPayload?.note;
  if (deliveryNote) {
    parts.push(`Note: ${deliveryNote}`);
  }
  return parts.join('\n');
}

export function buildStoredOrderPayload({ catalogPayload, extraText, imagePayloadUrl, note }) {
  const base = catalogPayload?.items?.length
    ? catalogPayload
    : { items: [], estimatedTotal: 0, itemCount: 0 };
  return buildVisualOrderPayload({
    catalogItems: base.items,
    extraText,
    imageUrl: imagePayloadUrl,
    note,
  });
}
