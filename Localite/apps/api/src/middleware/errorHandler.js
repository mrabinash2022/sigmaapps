import { OrderStateError } from '../services/orderStateMachine.js';
import logger, { logError } from '../logging/logger.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  const meta = {
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    userId: req.user?.id || null,
  };

  if (statusCode >= 500) {
    logError('Request error', err, meta);
  } else {
    logger.warn(message, { ...meta, errorName: err.name });
  }

  res.status(statusCode).json({
    error: message,
    ...(err.name === 'OrderStateError' ? { code: 'ORDER_STATE_ERROR' } : {}),
  });
}

export function notFoundHandler(req, res) {
  logger.warn('Route not found', { method: req.method, path: req.originalUrl || req.url });
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export { OrderStateError };
