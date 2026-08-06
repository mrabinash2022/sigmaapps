import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

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
  return { accessToken, refreshToken };
}

export async function saveTokens({ accessToken: at, refreshToken: rt }) {
  accessToken = at;
  refreshToken = rt;
  await SecureStore.setItemAsync('accessToken', at);
  if (rt) await SecureStore.setItemAsync('refreshToken', rt);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
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
  } catch {
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
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
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
  getAreas: () => request('/api/areas'),
  getShopsByArea: (areaId, { category, page = 1, limit = PAGE_LIMIT } = {}) =>
    request(`/api/shops/area/${areaId}${buildQuery({ category, page, limit })}`),
  getShop: (shopId) => request(`/api/shops/${shopId}`),
  getShopCatalog: (shopId) => request(`/api/shops/${shopId}/catalog`),
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
    return data;
  },
  publishCatalogItem: (shopId, itemId) =>
    request(`/api/shops/my/${shopId}/catalog/items/${itemId}/publish`, { method: 'PATCH' }),
  unpublishCatalogItem: (shopId, itemId) =>
    request(`/api/shops/my/${shopId}/catalog/items/${itemId}/unpublish`, { method: 'PATCH' }),
  deleteCatalogItem: (shopId, itemId) =>
    request(`/api/shops/my/${shopId}/catalog/items/${itemId}`, { method: 'DELETE' }),
  setVisualCatalogEnabled: (shopId, enabled) =>
    request(`/api/shops/my/${shopId}/visual-catalog`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  // Orders
  submitOrder: async (shopId, textPayload, imageUri) => {
    await ensureTokensLoaded();
    const formData = new FormData();
    formData.append('shopId', shopId);
    if (textPayload) formData.append('textPayload', textPayload);
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
    }
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}/api/orders/submit-flexible-order`, { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
    return data;
  },
  submitCatalogOrder: (shopId, items, note) =>
    request('/api/orders/submit-catalog-order', {
      method: 'POST',
      body: JSON.stringify({ shopId, items, note }),
    }),
  submitVisualOrder: async (shopId, { items = [], extraText = '', note = '', imageUri = null } = {}) => {
    await ensureTokensLoaded();
    const formData = new FormData();
    formData.append('shopId', shopId);
    if (items.length) formData.append('items', JSON.stringify(items));
    if (extraText) formData.append('extraText', extraText);
    if (note) formData.append('note', note);
    if (imageUri) {
      const filename = imageUri.split('/').pop();
      formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
    }
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}/api/orders/submit-catalog-order`, { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
    return data;
  },
  getMyOrders: () => request('/api/orders/my'),
  getShopOrders: (shopId) => request(`/api/orders/shop/${shopId}`),
  getOrder: (orderId) => request(`/api/orders/${orderId}`),
  acceptOrder: (orderId, finalBillAmount, deliveryTimeWindow, fulfillment, createBackorder) =>
    request(`/api/orders/transition/accept/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        finalBillAmount,
        deliveryTimeWindow,
        fulfillment,
        createBackorder,
      }),
    }),
  markBackorderReady: (orderId, finalBillAmount, deliveryTimeWindow) =>
    request(`/api/orders/transition/backorder-ready/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ finalBillAmount, deliveryTimeWindow }),
    }),
  selectPayment: (orderId, paymentMethod) =>
    request(`/api/orders/transition/select-payment/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentMethod }),
    }),
  createRazorpayOrder: (orderId) =>
    request(`/api/orders/transition/create-razorpay-order/${orderId}`, { method: 'POST' }),
  verifyPayment: (orderId, paymentData) =>
    request(`/api/orders/transition/verify-payment/${orderId}`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),
  payOrderMock: (orderId) =>
    request(`/api/orders/transition/pay/${orderId}`, { method: 'PATCH' }),
  shipOrder: (orderId) =>
    request(`/api/orders/transition/ship/${orderId}`, { method: 'PATCH' }),
  deliverOrder: (orderId) =>
    request(`/api/orders/transition/deliver/${orderId}`, { method: 'PATCH' }),
  rejectOrder: (orderId, reason) =>
    request(`/api/orders/transition/reject/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  returnOrder: (orderId, reason) =>
    request(`/api/orders/transition/return/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  refundOrder: (orderId) =>
    request(`/api/orders/transition/refund/${orderId}`, { method: 'POST' }),

  reorderOrder: (orderId) =>
    request(`/api/orders/reorder/${orderId}`, { method: 'POST' }),

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

  // Super admin
  getPendingShops: ({ page = 1, limit = PAGE_LIMIT } = {}) =>
    request(`/api/admin/shops/pending${buildQuery({ page, limit })}`),
  getAllShops: ({ page = 1, limit = PAGE_LIMIT } = {}) =>
    request(`/api/admin/shops${buildQuery({ page, limit })}`),
  inviteShop: (body) => request('/api/admin/shops/invite', { method: 'POST', body: JSON.stringify(body) }),
  approveShop: (shopId, rank) =>
    request(`/api/admin/shops/${shopId}/approve`, { method: 'PATCH', body: JSON.stringify({ rank }) }),
  rejectShop: (shopId, rejectionReason) =>
    request(`/api/admin/shops/${shopId}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason }) }),
  updateShopOperationalStatus: (shopId, operationalStatus) =>
    request(`/api/admin/shops/${shopId}/operational-status`, {
      method: 'PATCH',
      body: JSON.stringify({ operationalStatus }),
    }),
  updateShop: (shopId, body) =>
    request(`/api/admin/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteShop: (shopId) => request(`/api/admin/shops/${shopId}`, { method: 'DELETE' }),
  createArea: (name, city) =>
    request('/api/admin/areas', { method: 'POST', body: JSON.stringify({ name, city }) }),

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
};

export { API_URL };
