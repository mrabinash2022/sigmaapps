import {
  api,
  login,
  authHeader,
  DEMO,
  getFirstArea,
  getDailyNeedsShop,
  getShopAdminShop,
} from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleBannerPath = path.join(__dirname, 'fixtures', 'sample-banner.png');

describe('Home & storefront', () => {
  describe('role home feeds', () => {
    it('returns customer home with offers and favorites', async () => {
      const { token } = await login(DEMO.customer);

      const res = await api()
        .get('/api/home/customer')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('platformOffers');
      expect(res.body).toHaveProperty('topOffers');
      expect(res.body).toHaveProperty('favoriteStores');
      expect(res.body).toHaveProperty('announcements');
      expect(Array.isArray(res.body.platformOffers)).toBe(true);
      expect(Array.isArray(res.body.favoriteStores)).toBe(true);
    });

    it('returns shopkeeper home with announcements and store info', async () => {
      const { token } = await login(DEMO.shopAdmin);

      const res = await api()
        .get('/api/home/shopkeeper')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('shop');
      expect(res.body).toHaveProperty('announcements');
      expect(res.body).toHaveProperty('topOffers');
      expect(res.body).toHaveProperty('storeInfo');
      expect(Array.isArray(res.body.announcements)).toBe(true);
    });

    it('returns super admin home with top shops', async () => {
      const { token } = await login(DEMO.superAdmin);

      const res = await api()
        .get('/api/home/super-admin')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('topShopsByRevenue');
      expect(res.body).toHaveProperty('topShopsByVolume');
      expect(Array.isArray(res.body.topShopsByRevenue)).toBe(true);
    });

    it('denies customer from shopkeeper and super-admin home', async () => {
      const { token } = await login(DEMO.customer);

      const shopkeeperRes = await api()
        .get('/api/home/shopkeeper')
        .set(authHeader(token));
      expect(shopkeeperRes.status).toBe(403);

      const adminRes = await api()
        .get('/api/home/super-admin')
        .set(authHeader(token));
      expect(adminRes.status).toBe(403);
    });
  });

  describe('customer favorites', () => {
    it('lists, adds, and removes favorite shops', async () => {
      const { token } = await login(DEMO.customer);
      const area = await getFirstArea();
      const shop = await getDailyNeedsShop(area.id);

      const listRes = await api()
        .get('/api/home/favorites')
        .set(authHeader(token));
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.shopIds)).toBe(true);

      const addRes = await api()
        .post(`/api/home/favorites/${shop.id}`)
        .set(authHeader(token));
      expect(addRes.status).toBe(201);

      const afterAdd = await api()
        .get('/api/home/favorites')
        .set(authHeader(token));
      expect(afterAdd.body.shopIds).toContain(shop.id);

      const removeRes = await api()
        .delete(`/api/home/favorites/${shop.id}`)
        .set(authHeader(token));
      expect(removeRes.status).toBe(200);
    });
  });

  describe('shop store info & offers', () => {
    it('manages store info for shopkeeper shop', async () => {
      const { token } = await login(DEMO.shopAdmin);
      const shop = await getShopAdminShop(token);

      const getRes = await api()
        .get(`/api/shops/my/${shop.id}/store-info`)
        .set(authHeader(token));
      expect(getRes.status).toBe(200);

      const putRes = await api()
        .put(`/api/shops/my/${shop.id}/store-info`)
        .set(authHeader(token))
        .send({
          openTime: '08:30',
          closeTime: '22:00',
          weeklyOffDays: [1],
          isManuallyClosed: false,
          closedMessage: null,
        });
      expect(putRes.status).toBe(200);
      expect(putRes.body.storeInfo.openTime).toBe('08:30');
      expect(putRes.body.storeInfo.closeTime).toBe('22:00');
      expect(putRes.body.storeInfo.weeklyOffDays).toEqual([1]);
      expect(putRes.body.storeInfo.status).toHaveProperty('isOpen');
    });

    it('creates, updates, and deletes shop offers', async () => {
      const { token } = await login(DEMO.shopAdmin);
      const shop = await getShopAdminShop(token);
      const title = `API Test Offer ${Date.now()}`;

      const createRes = await api()
        .post(`/api/shops/my/${shop.id}/offers`)
        .set(authHeader(token))
        .send({
          title,
          description: 'Test discount',
          discountType: 'percent',
          discountValue: 15,
          isActive: true,
          showOnShopPage: true,
        });
      expect(createRes.status).toBe(201);
      const offerId = createRes.body.offer.id;
      expect(createRes.body.offer.title).toBe(title);

      const listRes = await api()
        .get(`/api/shops/my/${shop.id}/offers`)
        .set(authHeader(token));
      expect(listRes.status).toBe(200);
      expect(listRes.body.offers.some((o) => o.id === offerId)).toBe(true);

      const patchRes = await api()
        .patch(`/api/shops/my/${shop.id}/offers/${offerId}`)
        .set(authHeader(token))
        .send({ discountValue: 20 });
      expect(patchRes.status).toBe(200);
      expect(Number(patchRes.body.offer.discountValue)).toBe(20);

      const deleteRes = await api()
        .delete(`/api/shops/my/${shop.id}/offers/${offerId}`)
        .set(authHeader(token));
      expect(deleteRes.status).toBe(200);
    });

    it('uploads a banner image for a shop offer', async () => {
      const { token } = await login(DEMO.shopAdmin);
      const shop = await getShopAdminShop(token);
      const title = `Banner Offer ${Date.now()}`;

      const createRes = await api()
        .post(`/api/shops/my/${shop.id}/offers`)
        .set(authHeader(token))
        .field('title', title)
        .field('description', 'Banner test')
        .field('discountType', 'text')
        .field('isActive', 'true')
        .field('showOnShopPage', 'true')
        .attach('banner', sampleBannerPath);

      expect(createRes.status).toBe(201);
      expect(createRes.body.offer.bannerImageUrl).toBeTruthy();

      await api()
        .delete(`/api/shops/my/${shop.id}/offers/${createRes.body.offer.id}`)
        .set(authHeader(token));
    });

    it('denies customer from managing shop offers', async () => {
      const { token } = await login(DEMO.customer);
      const area = await getFirstArea();
      const shop = await getDailyNeedsShop(area.id);

      const res = await api()
        .post(`/api/shops/my/${shop.id}/offers`)
        .set(authHeader(token))
        .send({ title: 'Nope', discountType: 'text' });

      expect(res.status).toBe(403);
    });
  });

  describe('platform offers & announcements', () => {
    it('manages platform offers as super admin', async () => {
      const { token } = await login(DEMO.superAdmin);
      const title = `Platform Offer ${Date.now()}`;

      const createRes = await api()
        .post('/api/admin/platform-offers')
        .set(authHeader(token))
        .send({
          title,
          description: 'Platform-wide promo',
          discountType: 'text',
          audience: 'customers',
          isActive: true,
        });
      expect(createRes.status).toBe(201);
      const offerId = createRes.body.offer.id;

      const listRes = await api()
        .get('/api/admin/platform-offers')
        .set(authHeader(token));
      expect(listRes.status).toBe(200);
      expect(listRes.body.offers.some((o) => o.id === offerId)).toBe(true);

      await api()
        .delete(`/api/admin/platform-offers/${offerId}`)
        .set(authHeader(token));
    });

    it('manages announcements with optional push metadata', async () => {
      const { token } = await login(DEMO.superAdmin);
      const title = `Announcement ${Date.now()}`;

      const createRes = await api()
        .post('/api/admin/announcements')
        .set(authHeader(token))
        .send({
          title,
          body: 'Test announcement body',
          audience: 'shopkeepers',
          isActive: true,
          sendNotification: false,
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.announcement.title).toBe(title);
      const id = createRes.body.announcement.id;

      const listRes = await api()
        .get('/api/admin/announcements')
        .set(authHeader(token));
      expect(listRes.status).toBe(200);
      expect(listRes.body.announcements.some((a) => a.id === id)).toBe(true);

      const patchRes = await api()
        .patch(`/api/admin/announcements/${id}`)
        .set(authHeader(token))
        .send({ body: 'Updated body', sendNotification: false });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.announcement.body).toBe('Updated body');

      const deleteRes = await api()
        .delete(`/api/admin/announcements/${id}`)
        .set(authHeader(token));
      expect(deleteRes.status).toBe(200);
    });

    it('denies shopkeeper from platform admin home routes', async () => {
      const { token } = await login(DEMO.shopAdmin);

      const offersRes = await api()
        .get('/api/admin/platform-offers')
        .set(authHeader(token));
      expect(offersRes.status).toBe(403);

      const announcementsRes = await api()
        .get('/api/admin/announcements')
        .set(authHeader(token));
      expect(announcementsRes.status).toBe(403);
    });
  });
});
