# Localite application logs

Runtime logs are written here during development and testing. Log files are gitignored (`*.log`); only this folder structure is tracked.

## Layout

| Path | Source | Framework |
|------|--------|-----------|
| `backend/` | Node/Express API | [Winston](https://github.com/winstonjs/winston) + daily rotate |
| `frontend/` | Expo mobile app (via API ingest) | Client queue → `POST /api/logs/client` |

## Backend (`docs/logging/backend/`)

- `combined-YYYY-MM-DD.log` — all levels (debug and above in dev)
- `error-YYYY-MM-DD.log` — errors only

Configure with environment variables:

- `LOG_LEVEL` — `error`, `warn`, `info`, `http`, `debug` (default: `debug` in dev, `info` in production)
- `LOG_CONSOLE` — set to `false` to disable console output

HTTP requests, unhandled rejections, Sequelize SQL (dev), and API errors are logged automatically.

## Frontend (`docs/logging/frontend/`)

- `client-YYYY-MM-DD.log` — batched JSON lines from the mobile app

The app buffers logs locally and flushes to the API every few seconds (or on fatal JS errors). Use `import logger from './src/logging/logger'` in mobile code:

```js
import logger from '../logging/logger';

logger.info('Screen mounted', { screen: 'Profile' });
logger.warn('Cache miss', { key });
logger.error('Payment failed', err, { orderId });
```

Shared log shape and levels live in `packages/shared/src/logging.js`.
