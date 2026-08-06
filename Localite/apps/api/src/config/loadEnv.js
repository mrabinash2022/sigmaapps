import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '../..');

/**
 * Load environment variables.
 * 1. .env — non-secret defaults (optional, gitignored)
 * 2. dev.local — passwords & secrets (required locally, NEVER commit)
 *
 * Copy dev.local.example → dev.local and fill in your values.
 */
export function loadEnv() {
  const envPath = path.join(apiRoot, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const devLocalPath = path.join(apiRoot, 'dev.local');
  if (fs.existsSync(devLocalPath)) {
    dotenv.config({ path: devLocalPath, override: true });
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[localite] dev.local not found. Copy apps/api/dev.local.example → apps/api/dev.local'
    );
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
}
