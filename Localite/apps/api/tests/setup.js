import { loadEnv } from '../src/config/loadEnv.js';
import { createApp } from '../src/app.js';
import { bootstrapDatabase } from '../src/bootstrap.js';

loadEnv();

process.env.NODE_ENV = 'test';
process.env.DISABLE_AUTH_RATE_LIMIT = 'true';
process.env.DEV_OTP = process.env.DEV_OTP || '123456';

beforeAll(async () => {
  await bootstrapDatabase();
  global.testApp = createApp();
});
