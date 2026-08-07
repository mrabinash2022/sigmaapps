import logger, { logHttp } from '../logging/logger.js';

export function requestLogger(req, res, next) {
  const started = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - started;
    const meta = {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      ip: req.ip,
      userId: req.user?.id || null,
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP request failed', meta);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP client error', meta);
    } else {
      logHttp('HTTP request', meta);
    }
  });

  next();
}
