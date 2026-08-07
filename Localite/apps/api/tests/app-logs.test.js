import { api, login, authHeader, DEMO } from './helpers.js';

describe('App info & client logs', () => {
  it('returns app info for authenticated users', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .get('/api/app/info')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.app).toHaveProperty('about');
    expect(res.body.app).toHaveProperty('contactPhone');
  });

  it('accepts client log batches without auth', async () => {
    const res = await api()
      .post('/api/logs/client')
      .send({
        logs: [
          {
            level: 'info',
            message: 'Test log from API suite',
            platform: 'test',
            appVersion: '0.1.0',
          },
        ],
      });

    expect(res.status).toBe(202);
    expect(res.body.accepted).toBeGreaterThan(0);
  });

  it('accepts referral invite with phone or email', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .post('/api/app/refer')
      .set(authHeader(token))
      .send({ phone: '9876543210' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Invite sent/i);
  });
});
