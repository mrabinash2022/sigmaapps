import { api, login, authHeader, DEMO } from './helpers.js';

describe('Auth', () => {
  it('logs in customer with password', async () => {
    const { token, user } = await login(DEMO.customer);

    expect(token).toBeTruthy();
    expect(user.phone).toBe('8888888888');
    expect(user.role).toBe('customer');
  });

  it('logs in shop admin with password', async () => {
    const { user } = await login(DEMO.shopAdmin);
    expect(user.role).toBe('admin');
  });

  it('logs in super admin with password', async () => {
    const { user } = await login(DEMO.superAdmin);
    expect(user.role).toBe('super_admin');
  });

  it('rejects invalid credentials', async () => {
    const res = await api()
      .post('/api/auth/login/password')
      .send({ identifier: '8888888888', password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });

  it('returns current user from /api/auth/me', async () => {
    const { token } = await login(DEMO.customer);

    const res = await api()
      .get('/api/auth/me')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe('8888888888');
    expect(res.body.user.isOnboarded).toBe(true);
  });

  it('verifies OTP in dev mode', async () => {
    await api()
      .post('/api/auth/send-otp')
      .send({ phone: '8888888888' });

    const res = await api()
      .post('/api/auth/verify-otp')
      .send({ phone: '8888888888', otp: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('resets password via forgot-password flow', async () => {
    const sendRes = await api()
      .post('/api/auth/forgot-password/send-otp')
      .send({ phone: DEMO.customer.identifier });

    expect(sendRes.status).toBe(200);

    const resetRes = await api()
      .post('/api/auth/forgot-password/reset')
      .send({
        phone: DEMO.customer.identifier,
        otp: '123456',
        password: DEMO.customer.password,
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toMatch(/reset/i);
  });
});
