import crypto from 'crypto';

const CAPTCHA_TTL_MS = Number(process.env.CAPTCHA_TTL_MS) || 5 * 60 * 1000;
const challenges = new Map();

function purgeExpired() {
  const now = Date.now();
  for (const [token, challenge] of challenges.entries()) {
    if (challenge.expiresAt <= now) challenges.delete(token);
  }
}

export function createCaptchaChallenge() {
  purgeExpired();
  const a = crypto.randomInt(2, 12);
  const b = crypto.randomInt(2, 12);
  const token = crypto.randomBytes(16).toString('hex');
  challenges.set(token, {
    answer: String(a + b),
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
  });
  return {
    captchaToken: token,
    question: `What is ${a} + ${b}?`,
    expiresInSeconds: CAPTCHA_TTL_MS / 1000,
  };
}

export function verifyCaptchaChallenge(captchaToken, captchaAnswer) {
  if (!captchaToken || captchaAnswer === undefined || captchaAnswer === null) {
    return false;
  }
  purgeExpired();
  const challenge = challenges.get(captchaToken);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    challenges.delete(captchaToken);
    return false;
  }
  const valid = challenge.answer === String(captchaAnswer).trim();
  if (valid) challenges.delete(captchaToken);
  return valid;
}

export async function verifyRecaptchaIfConfigured(recaptchaToken) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (!recaptchaToken) return false;

  const payload = new URLSearchParams({
    secret,
    response: recaptchaToken,
  });
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload,
  });
  const data = await res.json();
  return Boolean(data.success);
}
