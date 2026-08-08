import { api, login, authHeader, DEMO } from './helpers.js';

describe('Super Admin', () => {
  it('lists pending and approved shops', async () => {
    const { token } = await login(DEMO.superAdmin);

    const pendingRes = await api()
      .get('/api/admin/shops/pending')
      .set(authHeader(token));
    expect(pendingRes.status).toBe(200);
    expect(Array.isArray(pendingRes.body.items)).toBe(true);

    const allRes = await api()
      .get('/api/admin/shops')
      .set(authHeader(token));
    expect(allRes.status).toBe(200);
    expect(allRes.body.items.length).toBeGreaterThan(0);
  });

  it('lists users with pagination', async () => {
    const { token } = await login(DEMO.superAdmin);

    const res = await api()
      .get('/api/admin/users?page=1&limit=20')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('total');
  });

  it('denies admin routes to customers', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .get('/api/admin/shops')
      .set(authHeader(token));

    expect(res.status).toBe(403);
  });

  it('toggles bulkBuyEnabled on a shop', async () => {
    const { token } = await login(DEMO.superAdmin);

    const allRes = await api()
      .get('/api/admin/shops?limit=1')
      .set(authHeader(token));
    expect(allRes.status).toBe(200);
    const shopId = allRes.body.items[0].id;

    const enableRes = await api()
      .patch(`/api/admin/shops/${shopId}`)
      .set(authHeader(token))
      .send({ bulkBuyEnabled: true });
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.shop.bulkBuyEnabled).toBe(true);

    const disableRes = await api()
      .patch(`/api/admin/shops/${shopId}`)
      .set(authHeader(token))
      .send({ bulkBuyEnabled: false });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.shop.bulkBuyEnabled).toBe(false);

    await api()
      .patch(`/api/admin/shops/${shopId}`)
      .set(authHeader(token))
      .send({ bulkBuyEnabled: true });
  });
});
