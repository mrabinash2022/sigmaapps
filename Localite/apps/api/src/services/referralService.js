import { sendEmail, sendSms } from './messagingService.js';
import { getAppInfo } from '../config/appInfo.js';

function buildReferralMessage(referrerName, info) {
  return [
    `Hi! ${referrerName} invited you to try ${info.name} — order from local shops near you.`,
    '',
    `Download: ${info.downloadLink}`,
    '',
    `Questions? Call ${info.contactPhone} or email ${info.contactEmail}.`,
  ].join('\n');
}

export async function sendAppReferral({ referrer, phone, email }) {
  const info = getAppInfo();
  const referrerName = referrer?.name?.trim() || 'A Localite user';
  const message = buildReferralMessage(referrerName, info);
  const subject = `${referrerName} invited you to ${info.name}`;

  const results = {};

  if (phone) {
    results.sms = await sendSms(phone, message);
  }

  if (email) {
    results.email = await sendEmail(email, subject, message);
  }

  const sent = Boolean(results.sms?.sent || results.email?.sent);

  return { sent, results, info };
}
