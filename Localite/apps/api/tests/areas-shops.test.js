import { api, getFirstArea, getDailyNeedsShop } from './helpers.js';

describe('Areas & Shops', () => {
  it('lists active areas publicly', async () => {
    const area = await getFirstArea();
    expect(area.name).toBeTruthy();
    expect(area.city).toBeTruthy();
  });

  it('gets area by id', async () => {
    const area = await getFirstArea();

    const res = await api().get(`/api/areas/${area.id}`);
    expect(res.status).toBe(200);
    expect(res.body.area.id).toBe(area.id);
  });

  it('lists enabled shops in an area with pagination', async () => {
    const area = await getFirstArea();

    const res = await api().get(`/api/shops/area/${area.id}?page=1&limit=20`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('hasMore');
  });

  it('includes store info and active offers on shop list items', async () => {
    const area = await getFirstArea();
    const res = await api().get(`/api/shops/area/${area.id}?limit=20`);

    expect(res.status).toBe(200);
    const shop = res.body.items.find((s) => s.name === 'Daily Needs Grocery') || res.body.items[0];
    expect(shop).toHaveProperty('storeInfo');
    expect(shop).toHaveProperty('activeOffers');
    expect(Array.isArray(shop.activeOffers)).toBe(true);

    const grocery = res.body.items.find((s) => s.name === 'Daily Needs Grocery');
    if (grocery?.storeInfo) {
      expect(grocery.storeInfo.openTime).toBeTruthy();
      expect(grocery.storeInfo.status).toHaveProperty('isOpen');
    }
    if (grocery?.activeOffers?.length) {
      expect(grocery.activeOffers[0]).toHaveProperty('title');
    }
  });

  it('gets shop detail publicly', async () => {
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const res = await api().get(`/api/shops/${shop.id}`);
    expect(res.status).toBe(200);
    expect(res.body.shop.id).toBe(shop.id);
    expect(res.body.shop.name).toBe('Daily Needs Grocery');
  });

  it('gets shop catalog when visual catalog is enabled', async () => {
    const area = await getFirstArea();
    const listRes = await api().get(`/api/shops/area/${area.id}?limit=50`);
    const visualShop = listRes.body.items.find((s) => s.visualCatalogEnabled);

    if (!visualShop) {
      return;
    }

    const res = await api().get(`/api/shops/${visualShop.id}/catalog`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('visualCatalogEnabled');
  });
});
