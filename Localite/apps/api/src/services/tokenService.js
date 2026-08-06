import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { RefreshToken } from '../models/index.js';
import { hashToken } from './cryptoService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'localite-dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'localite-refresh-secret-change-me';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY_DAYS = Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 7;

export function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}

export async function issueTokenPair(user, userAgent) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshTokenValue();
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: userAgent || null,
  });

  return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRY };
}

export async function rotateRefreshToken(oldToken, userAgent) {
  const tokenHash = hashToken(oldToken);
  const stored = await RefreshToken.findOne({
    where: { tokenHash, revokedAt: null },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  await stored.update({ revokedAt: new Date() });
  const { User } = await import('../models/index.js');
  const user = await User.findByPk(stored.userId);
  if (!user || !user.isActive) {
    throw Object.assign(new Error('User not found or inactive'), { statusCode: 401 });
  }

  return issueTokenPair(user, userAgent);
}

export async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { tokenHash, revokedAt: null } }
  );
}

export async function revokeAllUserTokens(userId) {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null } }
  );
}

export function issueRegistrationToken({ email, phone }) {
  return jwt.sign(
    { email, phone, purpose: 'register' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

export function verifyRegistrationToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.purpose !== 'register') {
    throw Object.assign(new Error('Invalid registration token'), { statusCode: 400 });
  }
  return payload;
}
