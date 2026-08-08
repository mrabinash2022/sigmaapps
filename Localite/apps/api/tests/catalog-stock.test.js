import {
  api,
  login,
  authHeader,
  DEMO,
  getFirstArea,
  getDailyNeedsShop,
  getShopAdminShop,
} from './helpers.js';

describe('Catalog stock tracking', () => {
  let shopId;
  let itemId;
  let itemName;
  let itemGroup;
  let itemPrice;

  beforeAll(async () => {
    const { token: adminToken } = await login(DEMO.shopAdmin);
    const shop = await getShopAdminShop(adminToken);
    shopId = shop.id;

    const manageRes = await api()
      .get(`/api/shops/my/${shopId}/catalog/manage`)
      .set(authHeader(adminToken));

    expect(manageRes.status).toBe(200);
    const item = manageRes.body.items.find((i) => i.publishStatus === 'published') || manageRes.body.items[0];
    expect(item).toBeTruthy();

    itemId = item.id;
    itemName = item.name;
    itemGroup = item.itemGroup;
    itemPrice = Number(item.price);

    const updateRes = await api()
      .patch(`/api/shops/my/${shopId}/catalog/items/${itemId}`)
      .set(authHeader(adminToken))
      .send({
        name: itemName,
        itemGroup,
        price: itemPrice,
        trackStock: true,
        stockQuantity: 1,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.trackStock).toBe(true);
    expect(Number(updateRes.body.item.stockQuantity)).toBe(1);
  });

  afterAll(async () => {
    const { token: adminToken } = await login(DEMO.shopAdmin);
    await api()
      .patch(`/api/shops/my/${shopId}/catalog/items/${itemId}`)
      .set(authHeader(adminToken))
      .send({
        name: itemName,
        itemGroup,
        price: itemPrice,
        trackStock: false,
        stockQuantity: '',
      });
  });

  it('rejects catalog order when requested quantity exceeds stock', async () => {
    const { token: customerToken } = await login(DEMO.customer);

    const res = await api()
      .post('/api/orders/submit-catalog-order')
      .set(authHeader(customerToken))
      .send({
        shopId,
        items: [{ catalogItemId: itemId, name: itemName, quantity: 2 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only 1/i);
  });

  it('accepts catalog order within stock and decrements inventory on fulfillment accept', async () => {
    const { token: customerToken } = await login(DEMO.customer);
    const { token: adminToken } = await login(DEMO.shopAdmin);

    const createRes = await api()
      .post('/api/orders/submit-catalog-order')
      .set(authHeader(customerToken))
      .send({
        shopId,
        items: [{ catalogItemId: itemId, name: itemName, quantity: 1 }],
      });

    expect(createRes.status).toBe(201);

    const acceptRes = await api()
      .patch(`/api/orders/transition/accept/${createRes.body.order.id}`)
      .set(authHeader(adminToken))
      .send({
        finalBillAmount: itemPrice,
        deliveryTimeWindow: 'Today 6-8 PM',
      });

    expect(acceptRes.status).toBe(200);

    const manageRes = await api()
      .get(`/api/shops/my/${shopId}/catalog/manage`)
      .set(authHeader(adminToken));

    const updatedItem = manageRes.body.items.find((i) => i.id === itemId);
    expect(Number(updatedItem.stockQuantity)).toBe(0);
    expect(updatedItem.isAvailable).toBe(false);

    const publicCatalog = await api().get(`/api/shops/${shopId}/catalog`);
    expect(publicCatalog.body.items.some((i) => i.id === itemId)).toBe(false);
  });
});
