import { normalizePhone } from './userService.js';

function isDevMode() {
  return process.env.NODE_ENV !== 'production';
}

function messagingEnabled(channel) {
  if (channel === 'sms') {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM);
  }
  if (channel === 'whatsapp') {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID
      && process.env.TWILIO_AUTH_TOKEN
      && process.env.TWILIO_WHATSAPP_FROM,
    );
  }
  if (channel === 'email') {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
  }
  return false;
}

function logDev(channel, to, message) {
  console.log(`[${channel.toUpperCase()}] to ${to}: ${message}`);
}

async function sendTwilioMessage({ to, from, body }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error: ${text}`);
  }
}

export async function sendSms(phone, message) {
  const to = normalizePhone(phone);
  if (!to) return { sent: false, reason: 'missing_phone' };

  if (!messagingEnabled('sms')) {
    if (isDevMode()) logDev('sms', to, message);
    return { sent: isDevMode(), channel: 'sms', mode: 'dev' };
  }

  try {
    await sendTwilioMessage({
      to: to.startsWith('+') ? to : `+91${to.replace(/^0+/, '')}`,
      from: process.env.TWILIO_SMS_FROM,
      body: message,
    });
    return { sent: true, channel: 'sms' };
  } catch (err) {
    console.error('SMS send failed:', err.message);
    return { sent: false, channel: 'sms', error: err.message };
  }
}

export async function sendWhatsApp(phone, message) {
  const to = normalizePhone(phone);
  if (!to) return { sent: false, reason: 'missing_phone' };

  if (!messagingEnabled('whatsapp')) {
    if (isDevMode()) logDev('whatsapp', to, message);
    return { sent: isDevMode(), channel: 'whatsapp', mode: 'dev' };
  }

  try {
    const formatted = to.startsWith('+') ? to : `+91${to.replace(/^0+/, '')}`;
    await sendTwilioMessage({
      to: `whatsapp:${formatted}`,
      from: process.env.TWILIO_WHATSAPP_FROM,
      body: message,
    });
    return { sent: true, channel: 'whatsapp' };
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
    return { sent: false, channel: 'whatsapp', error: err.message };
  }
}

export async function sendEmail(to, subject, text) {
  const recipient = (to || '').trim().toLowerCase();
  if (!recipient) return { sent: false, reason: 'missing_email' };

  if (!messagingEnabled('email')) {
    if (isDevMode()) logDev('email', recipient, `${subject}\n${text}`);
    return { sent: isDevMode(), channel: 'email', mode: 'dev' };
  }

  try {
    const res = await fetch(`${process.env.SMTP_HOST.replace(/\/$/, '')}/api/v1/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SMTP_PASS}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SMTP_FROM,
        to: recipient,
        subject,
        text,
      }),
    }).catch(() => null);

    if (res?.ok) return { sent: true, channel: 'email' };

    // Generic SMTP via nodemailer-less raw socket is heavy; fall back to console in dev.
    if (isDevMode()) {
      logDev('email', recipient, `${subject}\n${text}`);
      return { sent: true, channel: 'email', mode: 'dev' };
    }

    return { sent: false, channel: 'email', error: 'SMTP send failed' };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { sent: false, channel: 'email', error: err.message };
  }
}

export async function notifyContactAllChannels({ phone, email, name }, { title, message }) {
  const greeting = name ? `Hi ${name}, ` : '';
  const body = `${greeting}${message}`;

  const [sms, whatsapp, emailResult] = await Promise.all([
    sendSms(phone, body),
    sendWhatsApp(phone, body),
    sendEmail(email, title, body),
  ]);

  return { sms, whatsapp, email: emailResult };
}
