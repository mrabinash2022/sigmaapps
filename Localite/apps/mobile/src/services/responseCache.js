import { createTtlCache } from '@localite/shared';

const cache = createTtlCache();

export const MobileCacheTTL = {
  AREAS_MS: 60 * 60 * 1000,
  SHOPS_BY_AREA_MS: 2 * 60 * 1000,
  SHOP_CATALOG_MS: 3 * 60 * 1000,
  MY_ORDERS_MS: 30 * 1000,
  SHOP_ORDERS_MS: 30 * 1000,
  ORDER_DETAIL_MS: 15 * 1000,
};

export async function cachedFetch(key, ttlMs, fetcher, { force = false } = {}) {
  if (force) cache.delete(key);
  return cache.getOrSet(key, ttlMs, fetcher);
}

export function invalidateCachePrefix(prefix) {
  cache.invalidatePrefix(prefix);
}

export function invalidateCacheKey(key) {
  cache.delete(key);
}

export function clearResponseCache() {
  cache.clear();
}
