import { loadEnv } from './config/loadEnv.js';
import { createApp } from './app.js';
import { bootstrapDatabase } from './bootstrap.js';
import logger, { logError } from './logging/logger.js';
import { getStorageInfo } from './services/storageService.js';
import { isRazorpayEnabled } from './services/razorpayService.js';

loadEnv();

const app = createApp();
const PORT = process.env.PORT || 5000;

async function start() {
  process.on('unhandledRejection', (reason) => {
    logError('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
  });

  process.on('uncaughtException', (err) => {
    logError('Uncaught exception', err);
    process.exit(1);
  });

  try {
    await bootstrapDatabase();

    app.listen(PORT, () => {
      logger.info('Localite API started', {
        url: `http://localhost:${PORT}`,
        storage: getStorageInfo().provider,
        razorpay: isRazorpayEnabled() ? 'enabled' : 'disabled',
      });
    });
  } catch (err) {
    logError('Failed to start server', err);
    process.exit(1);
  }
}

start();
