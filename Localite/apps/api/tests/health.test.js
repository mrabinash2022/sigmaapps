import { api } from './helpers.js';

describe('GET /api/health', () => {
  it('returns ok status and service metadata', async () => {
    const res = await api().get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('localite-api');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('storage');
    expect(res.body).toHaveProperty('razorpay');
  });
});
