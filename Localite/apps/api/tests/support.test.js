import {
  api,
  login,
  authHeader,
  DEMO,
  getFirstArea,
  getDailyNeedsShop,
} from './helpers.js';

describe('Support tickets', () => {
  let orderId;
  let ticketId;

  beforeAll(async () => {
    const { token } = await login(DEMO.customer);
    const area = await getFirstArea();
    const shop = await getDailyNeedsShop(area.id);

    const createRes = await api()
      .post('/api/orders/submit-flexible-order')
      .set(authHeader(token))
      .field('shopId', shop.id)
      .field('textPayload', 'Support test order');

    orderId = createRes.body.order.id;
  });

  it('customer creates a support ticket for an order', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .post('/api/support/create-ticket')
      .set(authHeader(token))
      .send({
        orderId,
        issueType: 'Wrong_Item',
        customerMessage: 'Received wrong item in my order',
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket.id).toBeTruthy();
    ticketId = res.body.ticket.id;
  });

  it('customer lists their tickets', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .get('/api/support/my')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    const found = res.body.tickets.find((t) => t.id === ticketId);
    expect(found).toBeTruthy();
  });

  it('lists tickets for an order', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .get(`/api/support/order/${orderId}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.tickets.some((t) => t.id === ticketId)).toBe(true);
  });

  it('adds a message to a ticket', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .post(`/api/support/tickets/${ticketId}/messages`)
      .set(authHeader(token))
      .send({ message: 'Please call me about this issue' });

    expect(res.status).toBe(201);
    expect(res.body.ticket.messages?.length).toBeGreaterThan(0);
  });
});
