import { Router } from 'express';
import {
  isValidReferralEmail,
  isValidReferralPhone,
  normalizeReferralPhone,
} from '@localite/shared';
import { authenticate } from '../middleware/auth.js';
import { getAppInfo } from '../config/appInfo.js';
import { sendAppReferral } from '../services/referralService.js';

const router = Router();

router.get('/info', authenticate, (_req, res) => {
  res.json({ app: getAppInfo() });
});

router.post('/refer', authenticate, async (req, res, next) => {
  try {
    const phoneRaw = req.body.phone?.trim() || '';
    const emailRaw = req.body.email?.trim().toLowerCase() || '';

    if (!phoneRaw && !emailRaw) {
      return res.status(400).json({ error: 'Enter a mobile number or email to send the invite' });
    }

    const phone = phoneRaw ? normalizeReferralPhone(phoneRaw) : null;
    const email = emailRaw || null;

    if (phoneRaw && !isValidReferralPhone(phoneRaw)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }

    if (email && !isValidReferralEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const { sent, results } = await sendAppReferral({
      referrer: req.user,
      phone,
      email,
    });

    if (!sent) {
      return res.status(502).json({
        error: 'Could not deliver the invite right now. Try again later.',
        results,
      });
    }

    const channels = [];
    if (results.sms?.sent) channels.push('SMS');
    if (results.email?.sent) channels.push('email');

    res.json({
      message: `Invite sent via ${channels.join(' and ')}`,
      results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
