import logger from '../logging/logger.js';
import { processBulkBuyAutoClosures } from './bulkBuyCommitmentService.js';

export function startBulkBuyScheduler() {
  const intervalMs = Number(process.env.BULK_BUY_SCHEDULER_INTERVAL_MS || 60 * 60 * 1000);
  processBulkBuyAutoClosures().catch((err) => logger.warn('Bulk buy scheduler run failed', { error: err.message }));
  return setInterval(() => {
    processBulkBuyAutoClosures().catch((err) => logger.warn('Bulk buy scheduler run failed', { error: err.message }));
  }, intervalMs);
}
