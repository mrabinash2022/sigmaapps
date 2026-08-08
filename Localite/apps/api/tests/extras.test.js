import { api, authHeader, login, DEMO, getFirstArea, getDailyNeedsShop, getShopAdminShop } from './helpers.js';

describe('extras v0.10', () => {
  let orderId;
  let shopId;
  let areaId;

  beforeAll(async () => {
    const area = await getFirstArea();
    areaId = area.id;
    const shop = await getDailyNeedsShop(areaId);
    shopId = shop.id;

    const { token } = await login(DEMO.customer);
    const res = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(token))
      .field('shopId', shopId)
      .field('textPayload', 'Scheduled test order')
      .field('scheduledWindow', 'Tomorrow 9-11 AM');
    expect(res.status).toBe(201);
    orderId = res.body.order.id;
    expect(res.body.order.isScheduled).toBe(true);
    expect(res.body.order.scheduledWindow).toBe('Tomorrow 9-11 AM');
  });

  it('customer can add and list wishlist items', async () => {
    const { token } = await login(DEMO.customer);
    const catalog = await api()
      .get(`/api/shops/${shopId}/catalog`)
      .set(authHeader(token));
    const itemId = catalog.body.groups?.[0]?.items?.[0]?.id;
    if (!itemId) return;

    const add = await api()
      .post('/api/wishlist')
      .set(authHeader(token))
      .send({ catalogItemId: itemId });
    expect(add.status).toBe(201);

    const list = await api().get('/api/wishlist').set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.items.some((i) => i.catalogItemId === itemId || i.catalogItem?.id === itemId)).toBe(true);

    await api().delete(`/api/wishlist/${itemId}`).set(authHeader(token));
  });

  it('shop list includes rating field', async () => {
    const { token } = await login(DEMO.customer);
    const res = await api()
      .get(`/api/shops/area/${areaId}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    const shop = res.body.items.find((s) => s.id === shopId);
    expect(shop).toBeTruthy();
    expect(shop).toHaveProperty('rating');
  });

  it('shopkeeper can import catalog CSV', async () => {
    const { token } = await login(DEMO.shopAdmin);
    const adminShop = await getShopAdminShop(token);
    const csv = 'name,itemGroup,price\nTest CSV Ladoo,sweets,45\nTest CSV Barfi,sweets,55';
    const res = await api()
      .post(`/api/shops/my/${adminShop.id}/catalog/import-csv`)
      .set(authHeader(token))
      .send({ csv });
    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(2);
  });

  it('customer can rate delivered order', async () => {
    const { token: adminToken } = await login(DEMO.shopAdmin);
    await api()
      .patch(`/api/orders/transition/accept/${orderId}`)
      .set(authHeader(adminToken))
      .send({ finalBillAmount: 100, deliveryTimeWindow: 'Tomorrow 9-11 AM' });

    const { token: customerToken } = await login(DEMO.customer);
    await api()
      .patch(`/api/orders/transition/select-payment/${orderId}`)
      .set(authHeader(customerToken))
      .send({ paymentMethod: 'Cash_On_Delivery' });

    await api().patch(`/api/orders/transition/ship/${orderId}`).set(authHeader(adminToken));
    await api().patch(`/api/orders/transition/deliver/${orderId}`).set(authHeader(customerToken));

    const rate = await api()
      .post(`/api/ratings/orders/${orderId}`)
      .set(authHeader(customerToken))
      .send({ rating: 5, comment: 'Great service' });
    expect(rate.status).toBe(201);
    expect(rate.body.rating.rating).toBe(5);

    const dup = await api()
      .post(`/api/ratings/orders/${orderId}`)
      .set(authHeader(customerToken))
      .send({ rating: 4 });
    expect(dup.status).toBe(400);
  });
});
