import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isDevOtpEnabled() {
  return process.env.NODE_ENV !== 'production';
}

function getDevOtp() {
  return process.env.DEV_OTP || '123456';
}

export function generateOtp() {
  if (isDevOtpEnabled()) {
    return getDevOtp();
  }
  return String(crypto.randomInt(100000, 999999));
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

export function validatePassword(password) {
  if (!password || password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters'), { statusCode: 400 });
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw Object.assign(
      new Error('Password must include uppercase, lowercase, and a number'),
      { statusCode: 400 }
    );
  }
}

export function sanitizeUser(user) {
  const plain = user.toJSON ? user.toJSON() : user;
  delete plain.passwordHash;
  return plain;
}
