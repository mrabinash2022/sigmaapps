import { API_URL } from '../services/api';

export function resolveMediaUrl(url) {
  if (!url) return null;
  try {
    const apiOrigin = new URL(API_URL).origin;
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      return `${apiOrigin}${path}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function getPrimaryShop(user) {
  if (!user?.shops?.length) return null;
  return user.shops.find((s) => s.status === 'approved') || user.shops[0];
}

export function shopHasBulkBuyEnabled(user) {
  return Boolean(getPrimaryShop(user)?.bulkBuyEnabled);
}
