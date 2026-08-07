import { api, login, DEMO } from './helpers.js';

describe('Reports', () => {
  it('returns order report rows for customer', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .get('/api/reports/orders?preset=month')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('rows');
    expect(res.body.range.preset).toBe('month');
    if (res.body.rows.length) {
      const row = res.body.rows[0];
      expect(row).toHaveProperty('shopName');
      expect(row).toHaveProperty('shopNumber');
      expect(row).toHaveProperty('date');
      expect(row).toHaveProperty('items');
      expect(row).toHaveProperty('orderStatus');
      expect(row).toHaveProperty('paymentStatus');
      expect(row).toHaveProperty('totalAmount');
    }
  });

  it('exports excel report for shop admin', async () => {
    const { token } = await login(DEMO.shopAdmin);

    const res = await api()
      .get('/api/reports/orders/export?preset=month&format=xlsx')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(Number(res.headers['content-length'])).toBeGreaterThan(100);
  });

  it('exports pdf report for super admin', async () => {
    const { token } = await login(DEMO.superAdmin);

    const res = await api()
      .get('/api/reports/orders/export?preset=week&format=pdf')
      .set({ Authorization: `Bearer ${token}` })
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    const size = Buffer.isBuffer(res.body) ? res.body.length : Buffer.byteLength(res.body || []);
    expect(size).toBeGreaterThan(100);
  });
});
