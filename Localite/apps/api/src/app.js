import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRoutes from './routes/authRoutes.js';
import areaRoutes from './routes/areaRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import appRoutes from './routes/appRoutes.js';
import logRoutes from './routes/logRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import adminHomeRoutes from './routes/adminHomeRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import bulkBuyRoutes from './routes/bulkBuyRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { getStorageInfo } from './services/storageService.js';
import { isRazorpayEnabled } from './services/razorpayService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

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
  app.use('/api/reports', reportRoutes);
  app.use('/api/home', homeRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', adminHomeRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/addresses', addressRoutes);
  app.use('/api/ratings', ratingRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/bulk-buy', bulkBuyRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
