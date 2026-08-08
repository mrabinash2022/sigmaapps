import { api, authHeader, login, DEMO, getFirstArea, getShopAdminShop } from './helpers.js';
import { BulkBuyProductCategory } from '@localite/shared';

describe('bulk buy v0.11', () => {
  let areaId;
  let campaignId;
  let shopId;

  beforeAll(async () => {
    const area = await getFirstArea();
    areaId = area.id;

    const { token: adminToken } = await login(DEMO.shopAdmin);
    const shop = await getShopAdminShop(adminToken);
    shopId = shop.id;

    const { token: superToken } = await login(DEMO.superAdmin);
    await api()
      .patch(`/api/admin/shops/${shopId}`)
      .set(authHeader(superToken))
      .send({ bulkBuyEnabled: true });
  });

  it('shop /me exposes bulkBuyEnabled on linked shops', async () => {
    const { token } = await login(DEMO.shopAdmin);
    const res = await api()
      .get('/api/auth/me')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.user.shops?.[0]?.bulkBuyEnabled).toBe(true);
  });

  it('rejects store bulk buy actions when partner flag is off', async () => {
    const { token: superToken } = await login(DEMO.superAdmin);
    await api()
      .patch(`/api/admin/shops/${shopId}`)
      .set(authHeader(superToken))
      .send({ bulkBuyEnabled: false });

    const { token } = await login(DEMO.shopAdmin);
    const me = await api()
      .get('/api/auth/me')
      .set(authHeader(token));
    expect(me.body.user.shops[0].bulkBuyEnabled).toBe(false);

    const create = await api()
      .post('/api/bulk-buy/campaigns')
      .set(authHeader(token))
      .send({
        title: 'Should fail store campaign',
        productCategory: BulkBuyProductCategory.TELEVISION,
        minSubscribers: 2,
        shopId,
        areaId,
      });
    expect(create.status).toBe(403);
    expect(create.body.error).toMatch(/not enabled for bulk buy/i);

    const inbox = await api()
      .get('/api/bulk-buy/campaigns/inbox')
      .set(authHeader(token));
    expect(inbox.status).toBe(200);
    expect(inbox.body.campaigns).toEqual([]);

    await api()
      .patch(`/api/admin/shops/${shopId}`)
      .set(authHeader(superToken))
      .send({ bulkBuyEnabled: true });
  });

  it('customer can create a campaign', async () => {
    const { token } = await login(DEMO.customer);
    const res = await api()
      .post('/api/bulk-buy/campaigns')
      .set(authHeader(token))
      .send({
        title: 'Bulk buy test refrigerator',
        productCategory: BulkBuyProductCategory.REFRIGERATOR,
        minSubscribers: 2,
        areaId,
      });
    expect(res.status).toBe(201);
    expect(res.body.campaign.title).toContain('refrigerator');
    expect(res.body.campaign.canEdit).toBe(true);
    campaignId = res.body.campaign.id;
  });

  it('creator can edit campaign while collecting', async () => {
    const { token } = await login(DEMO.customer);
    const res = await api()
      .patch(`/api/bulk-buy/campaigns/${campaignId}`)
      .set(authHeader(token))
      .send({
        title: 'Bulk buy updated refrigerator',
        description: 'Prefer double-door 300L',
        minSubscribers: 2,
      });
    expect(res.status).toBe(200);
    expect(res.body.campaign.title).toContain('updated');
    expect(res.body.campaign.description).toContain('double-door');
  });

  it('non-creator cannot edit campaign', async () => {
    const { token: superToken } = await login(DEMO.superAdmin);
    const createUser = await api()
      .post('/api/admin/users')
      .set(authHeader(superToken))
      .send({
        name: 'Bulk Buyer Two',
        phone: '7777777702',
        password: 'Customer@123',
        role: 'customer',
        areaId,
      });
    expect([201, 409]).toContain(createUser.status);

    const { token: customer2 } = await login({ identifier: '7777777702', password: 'Customer@123' });
    const res = await api()
      .patch(`/api/bulk-buy/campaigns/${campaignId}`)
      .set(authHeader(customer2))
      .send({ title: 'Hijacked title' });
    expect(res.status).toBe(403);
  });

  it('second customer subscribes and reaches threshold', async () => {
    const { token: token1 } = await login(DEMO.customer);
    await api()
      .post(`/api/bulk-buy/campaigns/${campaignId}/subscribe`)
      .set(authHeader(token1));

    const { token: customer2 } = await login({ identifier: '7777777702', password: 'Customer@123' });
    const sub = await api()
      .post(`/api/bulk-buy/campaigns/${campaignId}/subscribe`)
      .set(authHeader(customer2));
    expect(sub.status).toBe(200);
    expect(sub.body.campaign.status).toBe('ready_for_offers');
    expect(sub.body.campaign.subscriberCount).toBeGreaterThanOrEqual(2);
    expect(sub.body.campaign.canEdit).toBe(false);
  });

  it('creator cannot edit after threshold is reached', async () => {
    const { token } = await login(DEMO.customer);
    const res = await api()
      .patch(`/api/bulk-buy/campaigns/${campaignId}`)
      .set(authHeader(token))
      .send({ title: 'Too late to edit' });
    expect(res.status).toBe(403);
  });

  it('bulk partner store can submit offer', async () => {
    const { token } = await login(DEMO.shopAdmin);
    const res = await api()
      .post(`/api/bulk-buy/campaigns/${campaignId}/offers`)
      .set(authHeader(token))
      .send({
        shopId,
        discountType: 'percent',
        discountValue: 12,
        termsText: 'Valid for all interested buyers this month',
        extras: { extendedWarrantyMonths: 12, installation: true },
      });
    expect(res.status).toBe(201);
    expect(Number(res.body.offer.discountValue)).toBe(12);
  });

  it('lists campaigns and offers for area', async () => {
    const { token } = await login(DEMO.customer);
    const list = await api()
      .get(`/api/bulk-buy/campaigns?areaId=${areaId}`)
      .set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.campaigns.some((c) => c.id === campaignId)).toBe(true);

    const offers = await api()
      .get(`/api/bulk-buy/campaigns/${campaignId}/offers`)
      .set(authHeader(token));
    expect(offers.status).toBe(200);
    expect(offers.body.offers.length).toBeGreaterThanOrEqual(1);
  });

  it('store inbox shows ready campaigns', async () => {
    const { token } = await login(DEMO.shopAdmin);
    const inbox = await api()
      .get('/api/bulk-buy/campaigns/inbox')
      .set(authHeader(token));
    expect(inbox.status).toBe(200);
    expect(inbox.body.campaigns.some((c) => c.id === campaignId)).toBe(true);
  });
});
