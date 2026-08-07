import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './config/loadEnv.js';
import sequelize from './database.js';
import './models/index.js';
import { Shop, User } from './models/index.js';
import { ShopOperationalStatus, ShopStatus, UserAccountStatus } from '@localite/shared';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger, { logError } from './logging/logger.js';
import authRoutes from './routes/authRoutes.js';
import areaRoutes from './routes/areaRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import appRoutes from './routes/appRoutes.js';
import logRoutes from './routes/logRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { migrateShopCodes } from './services/shopService.js';
import { migrateCatalogSchema } from './services/catalogSchemaMigration.js';
import { migrateOrderSchema } from './services/orderSchemaMigration.js';
import { migrateSupportSchema } from './services/supportSchemaMigration.js';
import { migrateUserProfileSchema } from './services/userSchemaMigration.js';
import { getStorageInfo } from './services/storageService.js';
import { isRazorpayEnabled } from './services/razorpayService.js';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(requestLogger);
app.use('/api/webhooks', webhookRoutes);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'localite-api',
    timestamp: new Date().toISOString(),
    storage: getStorageInfo(),
    razorpay: isRazorpayEnabled(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/app', appRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  process.on('unhandledRejection', (reason) => {
    logError('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
  });

  process.on('uncaughtException', (err) => {
    logError('Uncaught exception', err);
    process.exit(1);
  });

  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    try {
      await sequelize.query('UPDATE "OtpSessions" SET target = phone WHERE target IS NULL AND phone IS NOT NULL');
      await sequelize.query("UPDATE \"OtpSessions\" SET channel = 'sms' WHERE channel IS NULL");
      await sequelize.query('DELETE FROM "OtpSessions" WHERE target IS NULL');
    } catch {
      // OtpSessions table may not exist yet on first boot.
    }

    try {
      await sequelize.sync();
      logger.info('Database synced');
    } catch (syncErr) {
      logger.warn('Database sync skipped', { error: syncErr.message });
    }

    try {
      await migrateSupportSchema();
      await migrateUserProfileSchema();
      await migrateOrderSchema();
      await migrateCatalogSchema();
      logger.info('Schema migrations applied');
    } catch (migErr) {
      logger.warn('Schema migration warning', { error: migErr.message });
    }

    await Shop.update(
      { operationalStatus: ShopOperationalStatus.ENABLED },
      { where: { status: ShopStatus.APPROVED, operationalStatus: ShopOperationalStatus.DISABLED } },
    );

    const migrated = await migrateShopCodes(Shop);
    if (migrated > 0) {
      logger.info('Shop codes migrated', { count: migrated });
    }

    await User.update(
      { accountStatus: UserAccountStatus.ENABLED },
      { where: { isActive: true } },
    );
    await User.update(
      { accountStatus: UserAccountStatus.DISABLED },
      { where: { isActive: false } },
    );

    app.listen(PORT, () => {
      logger.info('Localite API started', {
        url: `http://localhost:${PORT}`,
        storage: getStorageInfo().provider,
        razorpay: isRazorpayEnabled() ? 'enabled' : 'disabled',
      });
    });
  } catch (err) {
    logError('Failed to start server', err);    process.exit(1);
  }
}

start();
