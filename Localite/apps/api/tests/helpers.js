import request from 'supertest';

export const DEMO = {
  customer: { identifier: '8888888888', password: 'Customer@123' },
  shopAdmin: { identifier: '9999999999', password: 'Admin@12345' },
  superAdmin: { identifier: '9000000001', password: 'SuperAdmin@123' },
};

export function api() {
  return request(global.testApp);
}

export async function login(credentials = DEMO.customer) {
  const res = await api()
    .post('/api/auth/login/password')
    .send(credentials);

  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    user: res.body.user,
  };
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function getFirstArea() {
  const res = await api().get('/api/areas');
  expect(res.status).toBe(200);
  expect(res.body.areas.length).toBeGreaterThan(0);
  return res.body.areas[0];
}

export async function getDailyNeedsShop(areaId) {
  const res = await api().get(`/api/shops/area/${areaId}?limit=50`);
  expect(res.status).toBe(200);
  const shop = res.body.items.find((s) => s.name === 'Daily Needs Grocery') || res.body.items[0];
  expect(shop).toBeTruthy();
  return shop;
}

export async function getShopAdminShop(token) {
  const res = await api()
    .get('/api/shops/my/application')
    .set(authHeader(token));
  expect(res.status).toBe(200);
  const shop = res.body.shops?.[0];
  expect(shop).toBeTruthy();
  return shop;
}
