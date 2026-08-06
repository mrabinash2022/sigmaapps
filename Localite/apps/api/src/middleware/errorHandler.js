import { OrderStateError } from '../services/orderStateMachine.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: message,
    ...(err.name === 'OrderStateError' ? { code: 'ORDER_STATE_ERROR' } : {}),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export { OrderStateError };
