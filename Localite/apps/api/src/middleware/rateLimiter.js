import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 30,
  message: { error: 'Too many auth attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev && process.env.DISABLE_AUTH_RATE_LIMIT === 'true',
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 3,
  message: { error: 'Too many OTP requests. Wait a minute.' },
  keyGenerator: (req) => req.body.phone || req.ip,
  skip: () => isDev && process.env.DISABLE_AUTH_RATE_LIMIT === 'true',
});
