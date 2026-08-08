import { getStoreStatusSummary, parseWeeklyOffDays } from '@localite/shared';

export function serializeStoreInfo(info) {
  if (!info) return null;
  const json = typeof info.toJSON === 'function' ? info.toJSON() : info;
  const weeklyOffDays = parseWeeklyOffDays(json.weeklyOffDays);
  const status = getStoreStatusSummary({ ...json, weeklyOffDays });
  return {
    ...json,
    weeklyOffDays,
    status,
  };
}

export async function getStoreInfoMap(ShopStoreInfo, shopIds) {
  if (!shopIds?.length) return {};
  const rows = await ShopStoreInfo.findAll({ where: { shopId: shopIds } });
  return Object.fromEntries(rows.map((row) => [row.shopId, serializeStoreInfo(row)]));
}

export function validateStoreInfoPayload(body) {
  const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;
  if (body.openTime && !timePattern.test(body.openTime)) {
    const err = new Error('openTime must be HH:mm');
    err.statusCode = 400;
    throw err;
  }
  if (body.closeTime && !timePattern.test(body.closeTime)) {
    const err = new Error('closeTime must be HH:mm');
    err.statusCode = 400;
    throw err;
  }
  if (body.weeklyOffDays) {
    const days = parseWeeklyOffDays(body.weeklyOffDays);
    if (days.some((d) => d < 0 || d > 6)) {
      const err = new Error('weeklyOffDays must be day numbers 0–6');
      err.statusCode = 400;
      throw err;
    }
  }
}

export function buildStoreInfoAttributes(body) {
  return {
    openTime: body.openTime?.trim() || null,
    closeTime: body.closeTime?.trim() || null,
    weeklyOffDays: parseWeeklyOffDays(body.weeklyOffDays),
    isManuallyClosed: Boolean(body.isManuallyClosed),
    closedMessage: body.closedMessage?.trim() || null,
    closedUntil: body.closedUntil || null,
  };
}

export async function upsertStoreInfo(ShopStoreInfo, shopId, body) {
  validateStoreInfoPayload(body);
  const attrs = buildStoreInfoAttributes(body);
  const [record] = await ShopStoreInfo.upsert({ shopId, ...attrs });
  return serializeStoreInfo(record);
}

export async function getShopStoreInfo(ShopStoreInfo, shopId) {
  const row = await ShopStoreInfo.findOne({ where: { shopId } });
  return serializeStoreInfo(row);
}

export async function assertShopAcceptingOrders(ShopStoreInfo, shopId) {
  const storeInfo = await getShopStoreInfo(ShopStoreInfo, shopId);
  if (!storeInfo) return storeInfo;

  const { isOpen, label } = storeInfo.status || {};
  if (!isOpen) {
    const err = new Error(label || 'This shop is not accepting orders right now');
    err.statusCode = 403;
    err.code = 'SHOP_CLOSED';
    throw err;
  }
  return storeInfo;
}
