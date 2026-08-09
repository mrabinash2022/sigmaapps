import { api, authHeader, login, DEMO, getFirstArea, getShopAdminShop } from './helpers.js';
import { BulkBuyProductCategory } from '@localite/shared';

describe('bulk buy v0.12', () => {
  let areaId;
  let campaignId;
  let shopId;
  let offerId;
  const dealDay = '2026-12-20';

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
    expect(res.body.campaign.deadlineAt).toBeTruthy();
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
        tokenAmount: 99,
        proposedDealDay: dealDay,
        termsText: 'Valid for all interested buyers this month',
        extras: { extendedWarrantyMonths: 12, installation: true },
      });
    expect(res.status).toBe(201);
    expect(Number(res.body.offer.discountValue)).toBe(12);
    expect(Number(res.body.offer.tokenAmount)).toBe(99);
    offerId = res.body.offer.id;
  });

  it('rejects store offer without proposedDealDay', async () => {
    const { token } = await login(DEMO.shopAdmin);
    const res = await api()
      .post(`/api/bulk-buy/campaigns/${campaignId}/offers`)
      .set(authHeader(token))
      .send({
        shopId,
        discountType: 'percent',
        discountValue: 8,
        tokenAmount: 99,
        termsText: 'Missing deal day',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/proposedDealDay/i);
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

  it('customer accepts offer and pays token', async () => {
    const { token } = await login(DEMO.customer);
    const accept = await api()
      .post(`/api/bulk-buy/campaigns/${campaignId}/offers/${offerId}/accept`)
      .set(authHeader(token));
    expect(accept.status).toBe(200);
    expect(accept.body.campaign.myCommitment?.commitmentStatus).toBe('token_pending');

    const paid = await api()
      .patch(`/api/bulk-buy/campaigns/${campaignId}/commitment/mock-pay-token`)
      .set(authHeader(token));
    expect(paid.status).toBe(200);
    expect(paid.body.campaign.myCommitment?.commitmentStatus).toBe('token_paid');
  });

  it('prevents accepting a second store after first commitment', async () => {
    const { token: superToken } = await login(DEMO.superAdmin);
    const secondShopRes = await api()
      .get('/api/admin/shops?limit=5')
      .set(authHeader(superToken));
    const altShop = secondShopRes.body.items.find((s) => s.id !== shopId);
    if (!altShop) return;

    await api()
      .patch(`/api/admin/shops/${altShop.id}`)
      .set(authHeader(superToken))
      .send({ bulkBuyEnabled: true });

    const altOffer = await api()
      .post(`/api/bulk-buy/campaigns/${campaignId}/offers`)
      .set(authHeader(superToken))
      .send({
        shopId: altShop.id,
        discountType: 'percent',
        discountValue: 15,
        tokenAmount: 199,
        proposedDealDay: dealDay,
        termsText: 'Alternate store offer',
      });
    expect([201, 403]).toContain(altOffer.status);

    if (altOffer.status === 201) {
      const { token } = await login(DEMO.customer);
      const res = await api()
        .post(`/api/bulk-buy/campaigns/${campaignId}/offers/${altOffer.body.offer.id}/accept`)
        .set(authHeader(token));
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/one store offer/i);
    }
  });

  it('creator sets poll and customer vote confirms deal day', async () => {
    const { token: creator } = await login(DEMO.customer);
    const poll = await api()
      .patch(`/api/bulk-buy/campaigns/${campaignId}/visit-poll`)
      .set(authHeader(creator))
      .send({ visitPollDates: [dealDay, '2026-12-27'] });
    expect(poll.status).toBe(200);
    expect(poll.body.campaign.visitPollDates).toContain(dealDay);

    const vote = await api()
      .post(`/api/bulk-buy/campaigns/${campaignId}/visit-poll/vote`)
      .set(authHeader(creator))
      .send({ pollDate: dealDay });
    expect(vote.status).toBe(200);

    const detail = await api()
      .get(`/api/bulk-buy/campaigns/${campaignId}`)
      .set(authHeader(creator));
    const offer = detail.body.campaign.offers.find((o) => o.id === offerId);
    expect(offer.confirmedDealDay).toBe(dealDay);
    expect(detail.body.campaign.myCommitment?.commitmentStatus).toBe('visit_scheduled');
  });

  it('store can list offer commitments', async () => {
    const { token } = await login(DEMO.shopAdmin);
    const res = await api()
      .get(`/api/bulk-buy/campaigns/${campaignId}/offers/${offerId}/commitments`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.commitments.length).toBeGreaterThanOrEqual(1);
  });

  it('creator can close campaign', async () => {
    const { token } = await login(DEMO.customer);
    const res = await api()
      .patch(`/api/bulk-buy/campaigns/${campaignId}/close`)
      .set(authHeader(token))
      .send({ reason: 'test_complete' });
    expect(res.status).toBe(200);
    expect(res.body.campaign.status).toBe('closed');
  });

  it('super admin can read bulk buy settings', async () => {
    const { token } = await login(DEMO.superAdmin);
    const res = await api()
      .get('/api/admin/bulk-buy-settings')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.settings.collectionPeriodDays).toBeGreaterThanOrEqual(1);
  });

  it('super admin can update bulk buy settings', async () => {
    const { token } = await login(DEMO.superAdmin);
    const res = await api()
      .patch('/api/admin/bulk-buy-settings')
      .set(authHeader(token))
      .send({
        collectionPeriodDays: 8,
        defaultMinSubscribers: 10,
        autoCloseGraceDaysAfterDealDay: 3,
      });
    expect(res.status).toBe(200);
    expect(res.body.settings.collectionPeriodDays).toBe(8);

    await api()
      .patch('/api/admin/bulk-buy-settings')
      .set(authHeader(token))
      .send({ collectionPeriodDays: 7 });
  });
});
