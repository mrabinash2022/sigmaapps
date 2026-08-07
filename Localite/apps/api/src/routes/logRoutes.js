import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { LogLevel } from '@localite/shared';
import { appendClientLogEntries } from '../logging/clientLogWriter.js';
import logger from '../logging/logger.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

const clientLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many log submissions. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const ALLOWED_LEVELS = new Set(Object.values(LogLevel));

function normalizeEntry(raw, userId) {
  if (!raw?.message) return null;

  const level = ALLOWED_LEVELS.has(raw.level) ? raw.level : LogLevel.INFO;
  const entry = {
    level,
    message: String(raw.message).slice(0, 2000),
    meta: {
      ...(raw.meta && typeof raw.meta === 'object' ? raw.meta : {}),
      platform: raw.platform || raw.meta?.platform,
      appVersion: raw.appVersion || raw.meta?.appVersion,
    },
    timestamp: raw.timestamp || new Date().toISOString(),
  };

  if (userId) entry.meta.userId = userId;
  if (raw.error) {
    entry.error = {
      name: raw.error.name || 'Error',
      message: String(raw.error.message || raw.error).slice(0, 2000),
      stack: raw.error.stack ? String(raw.error.stack).slice(0, 8000) : undefined,
    };
  }

  return entry;
}

router.post('/client', clientLogLimiter, optionalAuthenticate, async (req, res, next) => {
  try {
    const payload = Array.isArray(req.body?.logs) ? req.body.logs : [req.body];
    const userId = req.user?.id || null;

    const entries = payload
      .map((item) => normalizeEntry(item, userId))
      .filter(Boolean)
      .slice(0, 50);

    if (!entries.length) {
      return res.status(400).json({ error: 'No valid log entries provided' });
    }

    const result = appendClientLogEntries(entries);

    for (const entry of entries) {
      if (entry.level === LogLevel.ERROR) {
        logger.error(`[mobile] ${entry.message}`, { ...entry.meta, clientError: entry.error });
      } else if (entry.level === LogLevel.WARN) {
        logger.warn(`[mobile] ${entry.message}`, entry.meta);
      } else {
        logger.debug(`[mobile] ${entry.message}`, entry.meta);
      }
    }

    res.status(202).json({ accepted: result.written });
  } catch (err) {
    next(err);
  }
});

export default router;
