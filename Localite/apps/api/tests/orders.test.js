import {
  api,
  login,
  authHeader,
  DEMO,
  getFirstArea,
  getDailyNeedsShop,
  getShopAdminShop,
} from './helpers.js';

describe('Orders lifecycle', () => {
  let orderId;
  let shopId;

  it('customer places a flexible text order', async () => {
    const { token } = await login(DEMO.customer);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);
    shopId = shop.id;

    const res = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(token))
      .field('shopId', shop.id)
      .field('textPayload', '2kg rice, 1L oil, 500g sugar');

    expect(res.status).toBe(201);
    expect(res.body.order.id).toBeTruthy();
    expect(res.body.order.orderStatus).toBe('Created');
    orderId = res.body.order.id;
  });

  it('shop admin sees the new order in shop inbox', async () => {
    const { token } = await login(DEMO.shopAdmin);
    const shop = await getShopAdminShop(token);

    const res = await api()
      .get(`/api/orders/shop/${shop.id}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    const found = res.body.orders.find((o) => o.id === orderId);
    expect(found).toBeTruthy();
    expect(found.orderStatus).toBe('Created');
  });

  it('shop admin accepts order with bill and delivery window', async () => {
    const { token } = await login(DEMO.shopAdmin);

    const res = await api()
      .patch(`/api/orders/transition/accept/${orderId}`)
      .set(authHeader(token))
      .send({
        finalBillAmount: 450,
        deliveryTimeWindow: 'Today 6-8 PM',
      });

    expect(res.status).toBe(200);
    expect(res.body.order.orderStatus).toBe('Accepted');
    expect(Number(res.body.order.finalBillAmount)).toBe(450);
  });

  it('customer selects cash on delivery', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .patch(`/api/orders/transition/select-payment/${orderId}`)
      .set(authHeader(token))
      .send({ paymentMethod: 'Cash_On_Delivery' });

    expect(res.status).toBe(200);
    expect(res.body.order.paymentMethod).toBe('Cash_On_Delivery');
    expect(res.body.order.paymentStatus).toBe('Not_Required');
  });

  it('shop admin ships the order', async () => {
    const { token } = await login(DEMO.shopAdmin);

    const res = await api()
      .patch(`/api/orders/transition/ship/${orderId}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.order.orderStatus).toBe('Shipped');
  });

  it('customer marks order delivered', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .patch(`/api/orders/transition/deliver/${orderId}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.order.orderStatus).toBe('Delivered');
  });

  it('customer lists orders including the delivered one', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .get('/api/orders/my')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    const found = res.body.orders.find((o) => o.id === orderId);
    expect(found).toBeTruthy();
    expect(found.orderStatus).toBe('Delivered');
  });

  it('customer can reorder a delivered order', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .post(`/api/orders/reorder/${orderId}`)
      .set(authHeader(token));

    expect(res.status).toBe(201);
    expect(res.body.order.id).toBeTruthy();
    expect(res.body.order.id).not.toBe(orderId);
    expect(res.body.order.orderStatus).toBe('Created');
  });
});

describe('Order rejection', () => {
  it('shop admin can reject a newly created order', async () => {
    const { token: customerToken } = await login(DEMO.customer);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const createRes = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(customerToken))
      .field('shopId', shop.id)
      .field('textPayload', '1 packet biscuits');

    expect(createRes.status).toBe(201);
    const newOrderId = createRes.body.order.id;

    const { token: adminToken } = await login(DEMO.shopAdmin);
    const rejectRes = await api()
      .patch(`/api/orders/transition/reject/${newOrderId}`)
      .set(authHeader(adminToken))
      .send({ reason: 'Shop closed for the day' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.order.orderStatus).toBe('Rejected');
  });
});
