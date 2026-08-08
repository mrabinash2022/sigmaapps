import { Op } from 'sequelize';
import { OtpSession } from '../models/index.js';
import { generateOtp, hashOtp, verifyOtp } from './cryptoService.js';
import { sendEmail } from './messagingService.js';
import { normalizeEmail, normalizePhone } from './userService.js';

const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;

function normalizeTarget(target, channel) {
  return channel === 'email' ? normalizeEmail(target) : normalizePhone(target);
}

export function maskEmail(email) {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split('@');
  if (!domain) return normalized;
  const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

export async function createOtpSession(target, channel = 'sms', purpose = 'login') {
  const normalizedTarget = normalizeTarget(target, channel);
  if (!normalizedTarget) {
    throw Object.assign(new Error('Valid target is required for OTP'), { statusCode: 400 });
  }

  await OtpSession.update(
    { isUsed: true },
    { where: { target: normalizedTarget, channel, purpose, isUsed: false } },
  );

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await OtpSession.create({
    target: normalizedTarget,
    channel,
    purpose,
    phone: channel === 'sms' ? normalizedTarget : null,
    otpHash,
    expiresAt,
  });

  if (channel === 'sms') {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV SMS OTP] ${normalizedTarget}: ${otp}`);
    }
  } else {
    const subject = purpose === 'register'
      ? 'Verify your email for Localite registration'
      : purpose === 'password_reset'
        ? 'Your Localite password reset code'
        : 'Your Localite security code';
    const text = `Your Localite verification code is ${otp}. It expires in ${OTP_TTL_MS / 60000} minutes. Do not share this code with anyone.`;
    await sendEmail(normalizedTarget, subject, text);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV EMAIL OTP] ${normalizedTarget}: ${otp}`);
    }
  }

  return { sent: true, expiresInSeconds: OTP_TTL_MS / 1000 };
}

export async function verifyOtpSession(target, otp, channel = 'sms', purpose = 'login') {
  const normalizedTarget = normalizeTarget(target, channel);
  const session = await OtpSession.findOne({
    where: {
      target: normalizedTarget,
      channel,
      purpose,
      isUsed: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (!session) {
    throw Object.assign(new Error('Security code expired or not found. Request a new one.'), { statusCode: 401 });
  }

  if (session.attempts >= OTP_MAX_ATTEMPTS) {
    await session.update({ isUsed: true });
    throw Object.assign(new Error('Too many failed attempts. Request a new security code.'), { statusCode: 429 });
  }

  const devOtp = process.env.DEV_OTP || '123456';
  const acceptDevOtp = process.env.NODE_ENV !== 'production' && otp === devOtp;
  const valid = acceptDevOtp || await verifyOtp(otp, session.otpHash);
  if (!valid) {
    await session.update({ attempts: session.attempts + 1 });
    throw Object.assign(new Error('Invalid security code'), { statusCode: 401 });
  }

  await session.update({ isUsed: true });
  return true;
}
