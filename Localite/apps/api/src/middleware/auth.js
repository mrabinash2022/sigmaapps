import { User, ShopUser } from '../models/index.js';
import { UserRole, UserAccountStatus } from '@localite/shared';
import { verifyAccessToken } from '../services/tokenService.js';
import { sanitizeUser } from '../services/cryptoService.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findByPk(payload.id);
    if (!user || user.accountStatus !== UserAccountStatus.ENABLED || !user.isActive) {
      return res.status(401).json({ error: 'User not found or account is not active' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Attach user when a valid token is present; continue without user otherwise. */
export async function optionalAuthenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findByPk(payload.id);
    if (user && user.accountStatus === UserAccountStatus.ENABLED && user.isActive) {
      req.user = user;
    }
  } catch {
    // Ignore invalid tokens for optional auth routes.
  }

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireOnboarded(req, res, next) {
  if (!req.user.isOnboarded) {
    return res.status(403).json({ error: 'Please complete onboarding first', code: 'ONBOARDING_REQUIRED' });
  }
  next();
}

export async function requireShopAccess(req, res, next) {
  const shopId = req.params.shopId || req.body.shopId;
  if (!shopId) {
    return res.status(400).json({ error: 'shopId required' });
  }

  if (req.user.role === UserRole.SUPER_ADMIN) {
    req.shopId = shopId;
    return next();
  }

  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Shop access requires admin role' });
  }

  const link = await ShopUser.findOne({ where: { userId: req.user.id, shopId } });
  if (!link) {
    return res.status(403).json({ error: 'You do not have access to this shop' });
  }

  req.shopId = shopId;
  next();
}

export function formatAuthResponse(user, tokens) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: sanitizeUser(user),
  };
}
