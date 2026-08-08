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

describe('Order partial fulfillment', () => {
  it('shop admin can accept catalog order with unavailable items removed', async () => {
    const { token: customerToken } = await login(DEMO.customer);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const catalogRes = await api().get(`/api/shops/${shop.id}/catalog`);
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.items.length).toBeGreaterThanOrEqual(2);

    const [item1, item2] = catalogRes.body.items;

    const createRes = await api()
      .post('/api/orders/submit-catalog-order')
      .set(authHeader(customerToken))
      .send({
        shopId: shop.id,
        items: [
          { catalogItemId: item1.id, name: item1.name, quantity: 2 },
          { catalogItemId: item2.id, name: item2.name, quantity: 1 },
        ],
      });

    expect(createRes.status).toBe(201);
    const partialOrderId = createRes.body.order.id;

    const { buildFulfillmentLinesFromOrder, FulfillmentLineStatus } = await import('@localite/shared');
    const { lines } = buildFulfillmentLinesFromOrder(createRes.body.order);
    const fulfillmentLines = lines.map((line, idx) => {
      if (idx === 1) {
        return {
          ...line,
          quantityFulfilled: 0,
          status: FulfillmentLineStatus.UNAVAILABLE,
          unavailableReason: 'Out of stock',
        };
      }
      return line;
    });

    const fulfilledSubtotal = Number(item1.price) * 2;

    const { token: adminToken } = await login(DEMO.shopAdmin);
    const acceptRes = await api()
      .patch(`/api/orders/transition/accept/${partialOrderId}`)
      .set(authHeader(adminToken))
      .send({
        finalBillAmount: fulfilledSubtotal,
        deliveryTimeWindow: 'Today 6-8 PM',
        fulfillment: {
          lines: fulfillmentLines,
          shopNote: 'Sorry, one item is out of stock today',
        },
        createBackorder: false,
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.order.orderStatus).toBe('Accepted');
    expect(acceptRes.body.order.fulfillmentPayload.unavailableCount).toBeGreaterThan(0);
    expect(Number(acceptRes.body.order.finalBillAmount)).toBe(fulfilledSubtotal);
    expect(acceptRes.body.order.fulfillmentPayload.catalogSubtotal).toBe(fulfilledSubtotal);

    const customerGet = await api()
      .get(`/api/orders/${partialOrderId}`)
      .set(authHeader(customerToken));

    expect(customerGet.status).toBe(200);
    expect(customerGet.body.order.fulfillmentPayload.unavailableSummary.length).toBeGreaterThan(0);
    expect(customerGet.body.order.fulfillmentPayload.lines.some(
      (l) => l.status === FulfillmentLineStatus.UNAVAILABLE,
    )).toBe(true);
  });
});

describe('Order cancellation', () => {
  it('customer can cancel a created order', async () => {
    const { token: customerToken } = await login(DEMO.customer);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const createRes = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(customerToken))
      .field('shopId', shop.id)
      .field('textPayload', '1 packet salt');

    expect(createRes.status).toBe(201);
    const cancelOrderId = createRes.body.order.id;

    const cancelRes = await api()
      .patch(`/api/orders/transition/cancel/${cancelOrderId}`)
      .set(authHeader(customerToken))
      .send({ reason: 'Ordered by mistake' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.orderStatus).toBe('Cancelled');
    expect(cancelRes.body.order.cancellationReason).toBe('Ordered by mistake');
  });

  it('customer can cancel an accepted order before payment is selected', async () => {
    const { token: customerToken } = await login(DEMO.customer);
    const { token: adminToken } = await login(DEMO.shopAdmin);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const createRes = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(customerToken))
      .field('shopId', shop.id)
      .field('textPayload', '1 litre milk');

    expect(createRes.status).toBe(201);
    const acceptedCancelId = createRes.body.order.id;

    const acceptRes = await api()
      .patch(`/api/orders/transition/accept/${acceptedCancelId}`)
      .set(authHeader(adminToken))
      .send({ finalBillAmount: 60, deliveryTimeWindow: 'Today 6-8 PM' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.order.orderStatus).toBe('Accepted');

    const cancelRes = await api()
      .patch(`/api/orders/transition/cancel/${acceptedCancelId}`)
      .set(authHeader(customerToken))
      .send({ reason: 'Changed my mind' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.orderStatus).toBe('Cancelled');
  });

  it('customer cannot cancel after selecting payment', async () => {
    const { token: customerToken } = await login(DEMO.customer);
    const { token: adminToken } = await login(DEMO.shopAdmin);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const createRes = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(customerToken))
      .field('shopId', shop.id)
      .field('textPayload', 'Bread and butter');

    const paidCancelId = createRes.body.order.id;

    await api()
      .patch(`/api/orders/transition/accept/${paidCancelId}`)
      .set(authHeader(adminToken))
      .send({ finalBillAmount: 80, deliveryTimeWindow: 'Today 6-8 PM' });

    await api()
      .patch(`/api/orders/transition/select-payment/${paidCancelId}`)
      .set(authHeader(customerToken))
      .send({ paymentMethod: 'Cash_On_Delivery' });

    const cancelRes = await api()
      .patch(`/api/orders/transition/cancel/${paidCancelId}`)
      .set(authHeader(customerToken))
      .send({ reason: 'No longer needed' });

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.error).toMatch(/no longer be cancelled/i);
  });
});

describe('Closed shop ordering', () => {
  it('rejects orders when shop is manually closed', async () => {
    const { token: adminToken } = await login(DEMO.shopAdmin);
    const { token: customerToken } = await login(DEMO.customer);
    const shop = await getShopAdminShop(adminToken);

    const closeRes = await api()
      .put(`/api/shops/my/${shop.id}/store-info`)
      .set(authHeader(adminToken))
      .send({
        openTime: '08:00',
        closeTime: '22:00',
        isManuallyClosed: true,
        closedMessage: 'Closed for maintenance',
      });

    expect(closeRes.status).toBe(200);

    const orderRes = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(customerToken))
      .field('shopId', shop.id)
      .field('textPayload', '1 kg sugar');

    expect(orderRes.status).toBe(403);
    expect(orderRes.body.error).toMatch(/closed/i);

    await api()
      .put(`/api/shops/my/${shop.id}/store-info`)
      .set(authHeader(adminToken))
      .send({
        openTime: '08:00',
        closeTime: '22:00',
        isManuallyClosed: false,
      });
  });
});

describe('Backorder rejection', () => {
  it('shop admin can reject a backorder waiting for stock', async () => {
    const { token: customerToken } = await login(DEMO.customer);
    const { token: adminToken } = await login(DEMO.shopAdmin);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const catalogRes = await api().get(`/api/shops/${shop.id}/catalog`);
    expect(catalogRes.body.items.length).toBeGreaterThanOrEqual(2);

    const [item1, item2] = catalogRes.body.items;

    const createRes = await api()
      .post('/api/orders/submit-catalog-order')
      .set(authHeader(customerToken))
      .send({
        shopId: shop.id,
        items: [
          { catalogItemId: item1.id, name: item1.name, quantity: 1 },
          { catalogItemId: item2.id, name: item2.name, quantity: 1 },
        ],
      });

    const { buildFulfillmentLinesFromOrder, FulfillmentLineStatus } = await import('@localite/shared');
    const { lines } = buildFulfillmentLinesFromOrder(createRes.body.order);
    const fulfillmentLines = lines.map((line, idx) => {
      if (idx === 1) {
        return {
          ...line,
          quantityFulfilled: 0,
          status: FulfillmentLineStatus.UNAVAILABLE,
          unavailableReason: 'Out of stock',
        };
      }
      return line;
    });

    const acceptRes = await api()
      .patch(`/api/orders/transition/accept/${createRes.body.order.id}`)
      .set(authHeader(adminToken))
      .send({
        finalBillAmount: Number(item1.price),
        deliveryTimeWindow: 'Today 6-8 PM',
        fulfillment: {
          lines: fulfillmentLines,
          shopNote: 'One item will follow as backorder',
        },
        createBackorder: true,
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.backorderOrder).toBeTruthy();
    expect(acceptRes.body.backorderOrder.orderStatus).toBe('Backorder_Waiting');

    const rejectRes = await api()
      .patch(`/api/orders/transition/reject/${acceptRes.body.backorderOrder.id}`)
      .set(authHeader(adminToken))
      .send({ reason: 'Supplier cannot deliver this item' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.order.orderStatus).toBe('Rejected');
    expect(rejectRes.body.order.rejectionReason).toBe('Supplier cannot deliver this item');
  });
});
