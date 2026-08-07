import { createTtlCache } from '@localite/shared';

const cache = createTtlCache();

export const CacheTTL = {
  AREAS_MS: 10 * 60 * 1000,
  SHOPS_BY_AREA_MS: 2 * 60 * 1000,
  SHOP_CATALOG_MS: 2 * 60 * 1000,
};

export function cacheKey(...parts) {
  return parts.join(':');
}

export async function getCached(key, ttlMs, fetcher) {
  return cache.getOrSet(key, ttlMs, fetcher);
}

export function invalidateAreasCache() {
  cache.invalidatePrefix('areas:');
}

export function invalidateShopListCache(areaId = null) {
  if (areaId) {
    cache.invalidatePrefix(`shops:area:${areaId}:`);
    return;
  }
  cache.invalidatePrefix('shops:area:');
}

export function invalidateShopCatalogCache(shopId) {
  cache.delete(cacheKey('catalog', shopId));
  invalidateShopListCache();
}

export function invalidateShopCaches(shop) {
  if (shop?.id) invalidateShopCatalogCache(shop.id);
  if (shop?.areaId) invalidateShopListCache(shop.areaId);
  else invalidateShopListCache();
}
