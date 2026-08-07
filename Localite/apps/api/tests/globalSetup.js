import pg from 'pg';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../src/config/loadEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '..');

async function ensureTestDatabase() {
  const dbName = process.env.DB_NAME || 'localite_test_db';
  const client = new pg.Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });

  await client.connect();
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!existing.rowCount) {
    await client.query(`CREATE DATABASE "${dbName}"`);
  }
  await client.end();
}

export default async function globalSetup() {
  loadEnv();

  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'localite_test_db';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-localite';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-localite';
  process.env.DISABLE_AUTH_RATE_LIMIT = 'true';
  process.env.DEV_OTP = '123456';

  await ensureTestDatabase();

  const result = spawnSync('node', ['src/seeders/seed.js'], {
    cwd: apiRoot,
    env: { ...process.env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error('Test database seed failed. Ensure Postgres is running.');
  }
}
