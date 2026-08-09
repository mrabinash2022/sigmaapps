import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import logger, { setLoggerAccessToken } from '../logging/logger';
import {
  cachedFetch,
  clearResponseCache,
  invalidateCacheKey,
  invalidateCachePrefix,
  MobileCacheTTL,
} from './responseCache';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';
export const PAGE_LIMIT = 20;

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

let accessToken = null;
let refreshToken = null;

export async function loadTokens() {
  accessToken = await SecureStore.getItemAsync('accessToken');
  refreshToken = await SecureStore.getItemAsync('refreshToken');
  setLoggerAccessToken(accessToken);
  return { accessToken, refreshToken };
}

export async function getAccessToken() {
  if (!accessToken) await loadTokens();
  return accessToken;
}

export async function saveTokens({ accessToken: at, refreshToken: rt }) {
  accessToken = at;
  refreshToken = rt;
  setLoggerAccessToken(at);
  await SecureStore.setItemAsync('accessToken', at);
  if (rt) await SecureStore.setItemAsync('refreshToken', rt);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  setLoggerAccessToken(null);
  clearResponseCache();
  try {
    await SecureStore.deleteItemAsync('accessToken');
  } catch {
    // Key may already be missing — local logout should still succeed.
  }
  try {
    await SecureStore.deleteItemAsync('refreshToken');
  } catch {
    // Key may already be missing — local logout should still succeed.
  }
}

async function refreshAccessToken() {
  if (!refreshToken) throw new Error('No refresh token');
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Session expired');
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

async function ensureTokensLoaded() {
  if (!accessToken || !refreshToken) {
    await loadTokens();
  }
}

async function request(path, options = {}, retry = true) {
  await ensureTokensLoaded();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    logger.error('API network error', networkErr, { path, method: options.method || 'GET' });
    throw new Error(`Network error — cannot reach API at ${API_URL}`);
  }

  if (res.status === 401 && retry && refreshToken) {
    try {
      await refreshAccessToken();
      return request(path, options, false);
    } catch {
      await clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.warn('API request failed', {
      path,
      method: options.method || 'GET',
      status: res.status,
      error: data.error,
    });
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function requestCached(path, ttlMs, { force = false } = {}) {
  return cachedFetch(path, ttlMs, () => request(path), { force });
}

function invalidateOrdersCache() {
  invalidateCachePrefix('/api/orders/');
}

function invalidateShopCatalogCache(shopId) {
  invalidateCacheKey(`/api/shops/${shopId}/catalog`);
  invalidateCachePrefix('/api/shops/area/');
}

function invalidateHomeCache() {
  invalidateCachePrefix('/api/home/');
  invalidateCachePrefix('/api/shops/area/');
}

async function offerMutation(path, method, fields, imageUri = null) {
  await ensureTokensLoaded();
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let body;
  if (imageUri) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    const filename = imageUri.split('/').pop() || 'banner.jpg';
    formData.append('banner', { uri: imageUri, name: filename, type: 'image/jpeg' });
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(fields);
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Offer request failed');
  invalidateHomeCache();
  return data;
}

function invalidateAreasCache() {
  invalidateCacheKey('/api/areas');
}

async function mutateAndInvalidate(path, options, invalidate) {
  const data = await request(path, options);
  invalidate?.();
  return data;
}

async function logoutRequest(refreshTokenValue) {
  await ensureTokensLoaded();
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });
  } catch {
    // Network errors during logout are ignored; local session is cleared regardless.
  }
}

export const api = {
  // Auth
  getCaptcha: () => fetch(`${API_URL}/api/auth/captcha`).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load captcha');
    return data;
  }).catch((err) => {
    if (err.message?.includes('Network request failed') || err.name === 'TypeError') {
      throw new Error(`Network error — cannot reach API at ${API_URL}`);
    }
    throw err;
  }),
  registerSendEmailCode: (body) =>
    request('/api/auth/register/send-email-code', { method: 'POST', body: JSON.stringify(body) }),
  registerVerifyEmailCode: (body) =>
    request('/api/auth/register/verify-email-code', { method: 'POST', body: JSON.stringify(body) }),
  registerPassword: (body) => request('/api/auth/register/password', { method: 'POST', body: JSON.stringify(body) }),
  loginPassword: (identifier, password) =>
    request('/api/auth/login/password', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  sendOtp: (phone) => request('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, otp) =>
    request('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
  forgotPasswordSendOtp: (phone) =>
    request('/api/auth/forgot-password/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  forgotPasswordReset: (phone, otp, password) =>
    request('/api/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify({ phone, otp, password }) }),
  logout: (rt) => logoutRequest(rt),
  getMe: () => request('/api/auth/me'),
  updateProfile: (body) =>
    request('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  uploadProfilePicture: async (imageUri) => {
    await ensureTokensLoaded();
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'profile.jpg';
    formData.append('picture', { uri: imageUri, name: filename, type: 'image/jpeg' });
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}/api/auth/profile/picture`, { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Profile picture upload failed');
    return data;
  },
  onboardCustomer: (body) => request('/api/auth/onboard/customer', { method: 'POST', body: JSON.stringify(body) }),
  onboardAdmin: (body) => request('/api/auth/onboard/admin', { method: 'POST', body: JSON.stringify(body) }),
  registerDevice: (expoPushToken, platform) =>
    request('/api/auth/device/register', { method: 'POST', body: JSON.stringify({ expoPushToken, platform }) }),

  // Areas & Shops
  getAreas: ({ force = false } = {}) =>
    requestCached('/api/areas', MobileCacheTTL.AREAS_MS, { force }),
  getShopsByArea: (areaId, { category, q, page = 1, limit = PAGE_LIMIT, force = false } = {}) =>
    requestCached(
      `/api/shops/area/${areaId}${buildQuery({ category, q, page, limit })}`,
      MobileCacheTTL.SHOPS_BY_AREA_MS,
      { force },
    ),
  getShop: (shopId) => request(`/api/shops/${shopId}`),
  getShopCatalog: (shopId, { force = false } = {}) =>
    requestCached(`/api/shops/${shopId}/catalog`, MobileCacheTTL.SHOP_CATALOG_MS, { force }),
  applyShop: (body) => request('/api/shops/apply', { method: 'POST', body: JSON.stringify(body) }),
  getMyShopApplication: () => request('/api/shops/my/application'),

  // Shop catalog management (shopkeeper)
  getManageCatalog: (shopId) => request(`/api/shops/my/${shopId}/catalog/manage`),
  createCatalogItem: async (shopId, fields, imageUri = null) => {
    await ensureTokensLoaded();
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
    }
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}/api/shops/my/${shopId}/catalog/items`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create product');
    invalidateShopCatalogCache(shopId);
    return data;
  },
  updateCatalogItem: async (shopId, itemId, fields, imageUri = null) => {
    await ensureTokensLoaded();
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
    }
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}/api/shops/my/${shopId}/catalog/items/${itemId}`, {
      method: 'PATCH',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update product');
    invalidateShopCatalogCache(shopId);
    return data;
  },
  publishCatalogItem: (shopId, itemId) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}/catalog/items/${itemId}/publish`,
      { method: 'PATCH' },
      () => invalidateShopCatalogCache(shopId),
    ),
  unpublishCatalogItem: (shopId, itemId) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}/catalog/items/${itemId}/unpublish`,
      { method: 'PATCH' },
      () => invalidateShopCatalogCache(shopId),
    ),
  deleteCatalogItem: (shopId, itemId) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}/catalog/items/${itemId}`,
      { method: 'DELETE' },
      () => invalidateShopCatalogCache(shopId),
    ),
  setVisualCatalogEnabled: (shopId, enabled) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}/visual-catalog`,
      { method: 'PATCH', body: JSON.stringify({ enabled }) },
      () => invalidateShopCatalogCache(shopId),
    ),

  // Orders
  submitOrder: async (shopId, textPayload, imageUri, options = {}) => {
    await ensureTokensLoaded();
    const formData = new FormData();
    formData.append('shopId', shopId);
    if (textPayload) formData.append('textPayload', textPayload);
    if (options.addressId) formData.append('addressId', options.addressId);
    if (options.scheduledWindow) formData.append('scheduledWindow', options.scheduledWindow);
    if (options.scheduledFor) formData.append('scheduledFor', options.scheduledFor);
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
    }
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}/api/orders/submit-flexible-order`, { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
    invalidateOrdersCache();
    return data;
  },
  submitCatalogOrder: (shopId, items, note) =>
    mutateAndInvalidate(
      '/api/orders/submit-catalog-order',
      { method: 'POST', body: JSON.stringify({ shopId, items, note }) },
      invalidateOrdersCache,
    ),
  submitVisualOrder: async (shopId, { items = [], extraText = '', note = '', imageUri = null, addressId = null, scheduledWindow = null } = {}) => {
    await ensureTokensLoaded();
    const formData = new FormData();
    formData.append('shopId', shopId);
    if (items.length) formData.append('items', JSON.stringify(items));
    if (extraText) formData.append('extraText', extraText);
    if (note) formData.append('note', note);
    if (addressId) formData.append('addressId', addressId);
    if (scheduledWindow) formData.append('scheduledWindow', scheduledWindow);
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
    }
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}/api/orders/submit-catalog-order`, { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
    invalidateOrdersCache();
    return data;
  },
  getMyOrders: ({ force = false } = {}) =>
    requestCached('/api/orders/my', MobileCacheTTL.MY_ORDERS_MS, { force }),
  getShopOrders: (shopId, { force = false } = {}) =>
    requestCached(`/api/orders/shop/${shopId}`, MobileCacheTTL.SHOP_ORDERS_MS, { force }),
  getOrder: (orderId, { force = false } = {}) =>
    requestCached(`/api/orders/${orderId}`, MobileCacheTTL.ORDER_DETAIL_MS, { force }),
  acceptOrder: (orderId, finalBillAmount, deliveryTimeWindow, fulfillment, createBackorder, subtotalAmount, offerId) =>
    mutateAndInvalidate(
      `/api/orders/transition/accept/${orderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          finalBillAmount,
          deliveryTimeWindow,
          fulfillment,
          createBackorder,
          subtotalAmount,
          offerId,
        }),
      },
      invalidateOrdersCache,
    ),
  markBackorderReady: (orderId, finalBillAmount, deliveryTimeWindow) =>
    mutateAndInvalidate(
      `/api/orders/transition/backorder-ready/${orderId}`,
      { method: 'PATCH', body: JSON.stringify({ finalBillAmount, deliveryTimeWindow }) },
      invalidateOrdersCache,
    ),
  selectPayment: (orderId, paymentMethod) =>
    mutateAndInvalidate(
      `/api/orders/transition/select-payment/${orderId}`,
      { method: 'PATCH', body: JSON.stringify({ paymentMethod }) },
      invalidateOrdersCache,
    ),
  createRazorpayOrder: (orderId) =>
    mutateAndInvalidate(
      `/api/orders/transition/create-razorpay-order/${orderId}`,
      { method: 'POST' },
      invalidateOrdersCache,
    ),
  verifyPayment: (orderId, paymentData) =>
    mutateAndInvalidate(
      `/api/orders/transition/verify-payment/${orderId}`,
      { method: 'POST', body: JSON.stringify(paymentData) },
      invalidateOrdersCache,
    ),
  payOrderMock: (orderId) =>
    mutateAndInvalidate(
      `/api/orders/transition/pay/${orderId}`,
      { method: 'PATCH' },
      invalidateOrdersCache,
    ),
  shipOrder: (orderId) =>
    mutateAndInvalidate(
      `/api/orders/transition/ship/${orderId}`,
      { method: 'PATCH' },
      invalidateOrdersCache,
    ),
  deliverOrder: (orderId) =>
    mutateAndInvalidate(
      `/api/orders/transition/deliver/${orderId}`,
      { method: 'PATCH' },
      invalidateOrdersCache,
    ),
  rejectOrder: (orderId, reason) =>
    mutateAndInvalidate(
      `/api/orders/transition/reject/${orderId}`,
      { method: 'PATCH', body: JSON.stringify({ reason }) },
      invalidateOrdersCache,
    ),
  cancelOrder: (orderId, reason) =>
    mutateAndInvalidate(
      `/api/orders/transition/cancel/${orderId}`,
      { method: 'PATCH', body: JSON.stringify({ reason }) },
      invalidateOrdersCache,
    ),
  returnOrder: (orderId, reason) =>
    mutateAndInvalidate(
      `/api/orders/transition/return/${orderId}`,
      { method: 'PATCH', body: JSON.stringify({ reason }) },
      invalidateOrdersCache,
    ),
  refundOrder: (orderId) =>
    mutateAndInvalidate(
      `/api/orders/transition/refund/${orderId}`,
      { method: 'POST' },
      invalidateOrdersCache,
    ),

  reorderOrder: (orderId, body = {}) =>
    mutateAndInvalidate(
      `/api/orders/reorder/${orderId}`,
      { method: 'POST', body: JSON.stringify(body) },
      invalidateOrdersCache,
    ),

  collectCod: (orderId) =>
    mutateAndInvalidate(
      `/api/orders/transition/cod-collect/${orderId}`,
      { method: 'PATCH' },
      invalidateOrdersCache,
    ),

  previewOrderPricing: (shopId, subtotalAmount, offerId) =>
    request('/api/orders/pricing-preview', {
      method: 'POST',
      body: JSON.stringify({ shopId, subtotalAmount, offerId }),
    }),

  getAddresses: () => request('/api/addresses'),
  createAddress: (body) => request('/api/addresses', { method: 'POST', body: JSON.stringify(body) }),
  updateAddress: (addressId, body) =>
    request(`/api/addresses/${addressId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAddress: (addressId) => request(`/api/addresses/${addressId}`, { method: 'DELETE' }),

  updateMyShop: (shopId, body) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      invalidateHomeCache,
    ),

  getShopStaff: (shopId) => request(`/api/shops/my/${shopId}/staff`),
  inviteShopStaff: (shopId, body) =>
    request(`/api/shops/my/${shopId}/staff/invite`, { method: 'POST', body: JSON.stringify(body) }),
  removeShopStaff: (shopId, userId) =>
    request(`/api/shops/my/${shopId}/staff/${userId}`, { method: 'DELETE' }),

  getShopLowStock: (shopId) => request(`/api/shops/my/${shopId}/low-stock`),

  getPlatformAnalytics: ({ days = 30, force = false } = {}) =>
    requestCached(`/api/analytics/platform${buildQuery({ days })}`, MobileCacheTTL.HOME_MS, { force }),

  getShopInsights: (shopId, { days = 30 } = {}) =>
    request(`/api/analytics/shop/${shopId}${buildQuery({ days })}`),

  rateOrder: (orderId, rating, comment) =>
    request(`/api/ratings/orders/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),
  getOrderRating: (orderId) => request(`/api/ratings/orders/${orderId}`),

  getWishlist: () => request('/api/wishlist'),
  getWishlistIds: (shopId) => request(`/api/wishlist/ids${buildQuery({ shopId })}`),
  addWishlistItem: (catalogItemId) =>
    request('/api/wishlist', { method: 'POST', body: JSON.stringify({ catalogItemId }) }),
  removeWishlistItem: (catalogItemId) =>
    request(`/api/wishlist/${catalogItemId}`, { method: 'DELETE' }),

  importCatalogCsv: (shopId, csv, publish = false) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}/catalog/import-csv`,
      { method: 'POST', body: JSON.stringify({ csv, publish }) },
      () => invalidateShopCatalogCache(shopId),
    ),

  // Support
  createTicket: (orderId, issueType, customerMessage) =>
    request('/api/support/create-ticket', {
      method: 'POST',
      body: JSON.stringify({ orderId, issueType, customerMessage }),
    }),
  createSupportTicket: ({ orderId, issueType, message }) =>
    request('/api/support/create-ticket', {
      method: 'POST',
      body: JSON.stringify({ orderId, issueType, message, customerMessage: message }),
    }),
  getOrderTickets: (orderId) => request(`/api/support/order/${orderId}`),
  addTicketMessage: (ticketId, message) =>
    request(`/api/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  getMyTickets: () => request('/api/support/my'),
  getShopActiveTickets: (shopId) => request(`/api/support/merchant/active/${shopId}`),
  updateTicket: (ticketId, body) =>
    request(`/api/support/update-ticket/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // App info & referrals
  getAppInfo: () => request('/api/app/info'),
  sendAppReferral: ({ phone, email }) =>
    request('/api/app/refer', {
      method: 'POST',
      body: JSON.stringify({ phone, email }),
    }),

  getOrderReport: ({ preset = 'week', from, to, shopId } = {}) =>
    request(`/api/reports/orders${buildQuery({ preset, from, to, shopId })}`),

  getOrderReportExportUrl: ({ preset = 'week', from, to, shopId, format = 'xlsx' } = {}) =>
    `${API_URL}/api/reports/orders/export${buildQuery({ preset, from, to, shopId, format })}`,

  // Home & storefront
  getCustomerHome: ({ force = false } = {}) =>
    requestCached('/api/home/customer', MobileCacheTTL.HOME_MS, { force }),
  getShopkeeperHome: ({ force = false } = {}) =>
    requestCached('/api/home/shopkeeper', MobileCacheTTL.HOME_MS, { force }),
  getSuperAdminHome: ({ force = false } = {}) =>
    requestCached('/api/home/super-admin', MobileCacheTTL.HOME_MS, { force }),
  getFavoriteShopIds: () => request('/api/home/favorites'),
  addFavoriteShop: (shopId) =>
    mutateAndInvalidate(`/api/home/favorites/${shopId}`, { method: 'POST' }, invalidateHomeCache),
  removeFavoriteShop: (shopId) =>
    mutateAndInvalidate(`/api/home/favorites/${shopId}`, { method: 'DELETE' }, invalidateHomeCache),

  getShopStoreInfo: (shopId) => request(`/api/shops/my/${shopId}/store-info`),
  updateShopStoreInfo: (shopId, body) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}/store-info`,
      { method: 'PUT', body: JSON.stringify(body) },
      invalidateHomeCache,
    ),

  getShopOffers: (shopId) => request(`/api/shops/my/${shopId}/offers`),
  createShopOffer: (shopId, fields, imageUri = null) =>
    offerMutation(`/api/shops/my/${shopId}/offers`, 'POST', fields, imageUri),
  updateShopOffer: (shopId, offerId, fields, imageUri = null) =>
    offerMutation(`/api/shops/my/${shopId}/offers/${offerId}`, 'PATCH', fields, imageUri),
  deleteShopOffer: (shopId, offerId) =>
    mutateAndInvalidate(
      `/api/shops/my/${shopId}/offers/${offerId}`,
      { method: 'DELETE' },
      invalidateHomeCache,
    ),

  getPlatformOffers: () => request('/api/admin/platform-offers'),
  createPlatformOffer: (fields, imageUri = null) =>
    offerMutation('/api/admin/platform-offers', 'POST', fields, imageUri),
  updatePlatformOffer: (offerId, fields, imageUri = null) =>
    offerMutation(`/api/admin/platform-offers/${offerId}`, 'PATCH', fields, imageUri),
  deletePlatformOffer: (offerId) =>
    mutateAndInvalidate(
      `/api/admin/platform-offers/${offerId}`,
      { method: 'DELETE' },
      invalidateHomeCache,
    ),

  getAnnouncements: () => request('/api/admin/announcements'),
  createAnnouncement: (body) =>
    mutateAndInvalidate(
      '/api/admin/announcements',
      { method: 'POST', body: JSON.stringify(body) },
      invalidateHomeCache,
    ),
  updateAnnouncement: (id, body) =>
    mutateAndInvalidate(
      `/api/admin/announcements/${id}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      invalidateHomeCache,
    ),
  deleteAnnouncement: (id) =>
    mutateAndInvalidate(
      `/api/admin/announcements/${id}`,
      { method: 'DELETE' },
      invalidateHomeCache,
    ),

  // Super admin
  getPendingShops: ({ page = 1, limit = PAGE_LIMIT } = {}) =>
    request(`/api/admin/shops/pending${buildQuery({ page, limit })}`),
  getAllShops: ({ page = 1, limit = PAGE_LIMIT } = {}) =>
    request(`/api/admin/shops${buildQuery({ page, limit })}`),
  inviteShop: (body) => request('/api/admin/shops/invite', { method: 'POST', body: JSON.stringify(body) }),
  approveShop: (shopId, rank) =>
    mutateAndInvalidate(
      `/api/admin/shops/${shopId}/approve`,
      { method: 'PATCH', body: JSON.stringify({ rank }) },
      () => invalidateCachePrefix('/api/shops/area/'),
    ),
  rejectShop: (shopId, rejectionReason) =>
    request(`/api/admin/shops/${shopId}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason }) }),
  updateShopOperationalStatus: (shopId, operationalStatus) =>
    mutateAndInvalidate(
      `/api/admin/shops/${shopId}/operational-status`,
      { method: 'PATCH', body: JSON.stringify({ operationalStatus }) },
      () => invalidateCachePrefix('/api/shops/area/'),
    ),
  updateShop: (shopId, body) =>
    request(`/api/admin/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteShop: (shopId) => request(`/api/admin/shops/${shopId}`, { method: 'DELETE' }),
  createArea: (name, city) =>
    mutateAndInvalidate(
      '/api/admin/areas',
      { method: 'POST', body: JSON.stringify({ name, city }) },
      invalidateAreasCache,
    ),

  getAllUsers: ({ role, accountStatus, page = 1, limit = PAGE_LIMIT } = {}) =>
    request(`/api/admin/users${buildQuery({ role, accountStatus, page, limit })}`),
  createUser: (body) => request('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (userId, body) =>
    request(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateUserAccountStatus: (userId, accountStatus) =>
    request(`/api/admin/users/${userId}/account-status`, {
      method: 'PATCH',
      body: JSON.stringify({ accountStatus }),
    }),
  deleteUser: (userId) => request(`/api/admin/users/${userId}`, { method: 'DELETE' }),

  // Shopkeeper invitations
  getMyInvitations: () => request('/api/shops/my/invitations'),
  completeShopRegistration: (shopId, body) =>
    request(`/api/shops/${shopId}/complete-registration`, { method: 'POST', body: JSON.stringify(body) }),

  // Bulk buy
  getBulkBuyCampaigns: (areaId) =>
    request(`/api/bulk-buy/campaigns${buildQuery({ areaId })}`),
  createBulkBuyCampaign: (body) =>
    request('/api/bulk-buy/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  getBulkBuyCampaign: (campaignId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}`),
  subscribeBulkBuyCampaign: (campaignId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/subscribe`, { method: 'POST' }),
  unsubscribeBulkBuyCampaign: (campaignId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/subscribe`, { method: 'DELETE' }),
  updateBulkBuyCampaign: (campaignId, body) =>
    request(`/api/bulk-buy/campaigns/${campaignId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getBulkBuyInbox: () => request('/api/bulk-buy/campaigns/inbox'),
  getMyBulkBuyCampaigns: () => request('/api/bulk-buy/campaigns/mine'),
  getBulkBuyOffers: (campaignId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/offers`),
  submitBulkBuyOffer: (campaignId, body) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/offers`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  acceptBulkBuyOffer: (campaignId, offerId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/offers/${offerId}/accept`, { method: 'POST' }),
  withdrawBulkBuyCommitment: (campaignId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/commitment`, { method: 'DELETE' }),
  mockPayBulkBuyToken: (campaignId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/commitment/mock-pay-token`, { method: 'PATCH' }),
  setBulkBuyVisitPoll: (campaignId, visitPollDates) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/visit-poll`, {
      method: 'PATCH',
      body: JSON.stringify({ visitPollDates }),
    }),
  voteBulkBuyVisitPoll: (campaignId, pollDate) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/visit-poll/vote`, {
      method: 'POST',
      body: JSON.stringify({ pollDate }),
    }),
  closeBulkBuyCampaign: (campaignId, reason) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/close`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  getBulkBuyOfferCommitments: (campaignId, offerId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/offers/${offerId}/commitments`),
  completeBulkBuyCommitment: (campaignId, participantId) =>
    request(`/api/bulk-buy/campaigns/${campaignId}/commitments/${participantId}/complete`, { method: 'PATCH' }),
  getBulkBuySettings: () => request('/api/admin/bulk-buy-settings'),
  updateBulkBuySettings: (body) =>
    request('/api/admin/bulk-buy-settings', { method: 'PATCH', body: JSON.stringify(body) }),
};

export { API_URL };
