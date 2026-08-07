import { loadEnv } from '../src/config/loadEnv.js';
import sequelize from '../src/database.js';

loadEnv();

// Clears OTP session rows and drops legacy columns from older schema iterations.

await sequelize.authenticate();
await sequelize.query('TRUNCATE TABLE "OtpSessions"');
for (const col of ['target', 'channel', 'purpose']) {
  try {
    await sequelize.query(`ALTER TABLE "OtpSessions" DROP COLUMN IF EXISTS "${col}"`);
  } catch {
    // ignore
  }
}
console.log('OtpSessions migration cleanup done');
process.exit(0);
