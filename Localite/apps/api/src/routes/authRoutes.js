import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { User, Area, Shop } from '../models/index.js';
import { UserRole, UserAccountStatus } from '@localite/shared';
import { authenticate, formatAuthResponse, requireRole } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  sanitizeUser,
} from '../services/cryptoService.js';
import { createOtpSession, maskEmail, verifyOtpSession } from '../services/otpService.js';
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken, issueRegistrationToken, verifyRegistrationToken } from '../services/tokenService.js';
import { registerDevice, unregisterDevice } from '../services/notificationService.js';
import { assertRegistrationIdentity, isValidEmail, normalizeEmail, normalizePhone } from '../services/userService.js';
import { createCaptchaChallenge, verifyCaptchaChallenge } from '../services/captchaService.js';
import { uploadImage } from '../services/storageService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const profileUpload = multer({
  dest: uploadDir,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
  },
});

const router = Router();

async function findUserByIdentifier(identifier) {
  return User.findOne({
    where: {
      [Op.or]: [
        { phone: identifier },
        { username: identifier },
        { email: normalizeEmail(identifier) },
      ],
    },
  });
}

function assertAccountCanLogin(user) {
  if (!user) return;
  if (user.accountStatus === UserAccountStatus.DISABLED) {
    throw Object.assign(new Error('Your account is disabled. Contact the super admin.'), { statusCode: 403 });
  }
  if (user.accountStatus === UserAccountStatus.ON_HOLD) {
    throw Object.assign(new Error('Your account is on hold. Contact the super admin.'), { statusCode: 403 });
  }
  if (!user.isActive) {
    throw Object.assign(new Error('Your account is not active. Contact the super admin.'), { statusCode: 403 });
  }
}

function assertCaptcha(captchaToken, captchaAnswer) {
  if (!verifyCaptchaChallenge(captchaToken, captchaAnswer)) {
    throw Object.assign(new Error('Incorrect captcha. Please try again.'), { statusCode: 400 });
  }
}

async function issueAuthForUser(user, userAgent) {
  await user.update({ lastLoginAt: new Date() });
  const tokens = await issueTokenPair(user, userAgent);
  return formatAuthResponse(user, tokens);
}

// ─── Captcha ─────────────────────────────────────────────────────

router.get('/captcha', (_req, res) => {
  res.json(createCaptchaChallenge());
});

// ─── Password auth ───────────────────────────────────────────────

router.post('/register/send-email-code', authLimiter, otpLimiter, async (req, res, next) => {
  try {
    const { name, phone, email, password, role, captchaToken, captchaAnswer } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'name, phone, email, and password are required' });
    }
    assertCaptcha(captchaToken, captchaAnswer);
    validatePassword(password);

    const identity = await assertRegistrationIdentity(User, Shop, {
      phone,
      email,
      username: phone,
    });

    await createOtpSession(identity.email, 'email', 'register');
    res.json({
      message: 'Verification code sent to your email',
      email: maskEmail(identity.email),
      expiresInSeconds: Number(process.env.OTP_TTL_MS || 300000) / 1000,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register/verify-email-code', authLimiter, async (req, res, next) => {
  try {
    const { email, phone, emailOtp } = req.body;
    if (!email || !phone || !emailOtp) {
      return res.status(400).json({ error: 'email, phone, and email security code are required' });
    }

    const identity = {
      email: normalizeEmail(email),
      phone: normalizePhone(phone),
    };

    await verifyOtpSession(identity.email, emailOtp, 'email', 'register');

    const registrationToken = issueRegistrationToken(identity);
    res.json({
      verified: true,
      message: 'Email verified. You can now complete registration.',
      registrationToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register/password', authLimiter, async (req, res, next) => {
  try {
    const {
      name, phone, username, email, password, role, registrationToken, captchaToken, captchaAnswer,
    } = req.body;
    if (!name || !phone || !password || !email || !registrationToken) {
      return res.status(400).json({ error: 'name, phone, email, password, and verified email are required' });
    }
    assertCaptcha(captchaToken, captchaAnswer);
    validatePassword(password);

    const requestedRole = role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;
    if (role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot self-register as super admin' });
    }

    const identity = await assertRegistrationIdentity(User, Shop, {
      phone,
      email,
      username: username || phone,
    });

    const tokenPayload = verifyRegistrationToken(registrationToken);
    if (tokenPayload.email !== identity.email || tokenPayload.phone !== identity.phone) {
      return res.status(400).json({ error: 'Email verification does not match registration details. Please verify again.' });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      phone: identity.phone,
      username: username || identity.phone,
      email: identity.email,
      passwordHash,
      role: requestedRole,
      isOnboarded: false,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
    });

    const tokens = await issueTokenPair(user, req.headers['user-agent']);
    res.status(201).json(formatAuthResponse(user, tokens));
  } catch (err) {
    next(err);
  }
});

router.post('/login/password', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier (phone/username/email) and password required' });
    }

    const user = await findUserByIdentifier(identifier.trim());
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    assertAccountCanLogin(user);

    const response = await issueAuthForUser(user, req.headers['user-agent']);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─── OTP auth ────────────────────────────────────────────────────

router.post('/send-otp', authLimiter, otpLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }
    const result = await createOtpSession(phone, 'sms', 'login');
    res.json({ message: 'OTP sent to your phone', ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'phone and otp are required' });
    }

    await verifyOtpSession(phone, otp, 'sms', 'login');

    let user = await User.findOne({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      return res.status(403).json({
        error: 'Phone verified. Please register with your email using the Password tab to create an account.',
        code: 'REGISTRATION_REQUIRED',
      });
    }

    assertAccountCanLogin(user);

    await user.update({ phoneVerifiedAt: new Date() });
    const response = await issueAuthForUser(user, req.headers['user-agent']);
    res.json({ ...response, isNewUser });
  } catch (err) {
    next(err);
  }
});

// ─── Token management ────────────────────────────────────────────

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }
    const tokens = await rotateRefreshToken(refreshToken, req.headers['user-agent']);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ─── Profile & onboarding ─────────────────────────────────────────

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const includes = [{ association: 'area', attributes: ['id', 'name', 'city'] }];
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
      includes.push({
        association: 'shops',
        attributes: ['id', 'name', 'phone', 'shopCode', 'status', 'operationalStatus'],
        through: { attributes: [] },
      });
    }
    const user = await User.findByPk(req.user.id, { include: includes });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, address, areaId, email, smsNotificationsEnabled, whatsappNotificationsEnabled } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (areaId !== undefined) updates.areaId = areaId;
    if (smsNotificationsEnabled !== undefined) updates.smsNotificationsEnabled = Boolean(smsNotificationsEnabled);
    if (whatsappNotificationsEnabled !== undefined) updates.whatsappNotificationsEnabled = Boolean(whatsappNotificationsEnabled);
    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      const conflict = await User.findOne({
        where: { email: normalizedEmail, id: { [Op.ne]: req.user.id } },
      });
      if (conflict && conflict.phone !== req.user.phone) {
        return res.status(409).json({
          error: 'This email is already registered with a different mobile number.',
        });
      }
      if (normalizedEmail !== normalizeEmail(req.user.email)) {
        return res.status(400).json({
          error: 'Email changes require verification. Contact support or re-register with the new email.',
        });
      }
      updates.email = normalizedEmail;
    }

    await req.user.update(updates);
    const includes = [{ association: 'area', attributes: ['id', 'name', 'city'] }];
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
      includes.push({
        association: 'shops',
        attributes: ['id', 'name', 'phone', 'shopCode', 'status', 'operationalStatus', 'address'],
        through: { attributes: [] },
      });
    }
    const user = await User.findByPk(req.user.id, { include: includes });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/profile/picture', authenticate, profileUpload.single('picture'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'picture file is required' });
    }

    const profilePictureUrl = await uploadImage(req.file);
    await req.user.update({ profilePictureUrl });

    const includes = [{ association: 'area', attributes: ['id', 'name', 'city'] }];
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
      includes.push({
        association: 'shops',
        attributes: ['id', 'name', 'phone', 'shopCode', 'status', 'operationalStatus', 'address'],
        through: { attributes: [] },
      });
    }
    const user = await User.findByPk(req.user.id, { include: includes });
    res.json({ user: sanitizeUser(user), profilePictureUrl });
  } catch (err) {
    next(err);
  }
});

router.post('/onboard/customer', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const { name, address, areaId } = req.body;
    if (!name || !address || !areaId) {
      return res.status(400).json({ error: 'name, address, and areaId are required' });
    }

    const area = await Area.findByPk(areaId);
    if (!area) return res.status(404).json({ error: 'Area not found' });

    await req.user.update({ name, address, areaId, isOnboarded: true });
    res.json({ user: sanitizeUser(req.user), message: 'Customer onboarding complete' });
  } catch (err) {
    next(err);
  }
});

router.post('/onboard/admin', authenticate, async (req, res, next) => {
  try {
    const { name, address, areaId } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }

    await req.user.update({
      name,
      address,
      areaId: areaId || null,
      role: UserRole.ADMIN,
      isOnboarded: true,
    });

    res.json({
      user: sanitizeUser(req.user),
      message: 'Admin profile created. Submit a shop application for super admin approval.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/set-password', authenticate, async (req, res, next) => {
  try {
    const { password, currentPassword } = req.body;
    validatePassword(password);

    if (req.user.passwordHash) {
      if (!currentPassword || !(await verifyPassword(currentPassword, req.user.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    await req.user.update({ passwordHash: await hashPassword(password) });
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password/send-otp', authLimiter, otpLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const normalizedPhone = normalizePhone(phone);
    const user = await User.findOne({ where: { phone: normalizedPhone } });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this phone number' });
    }
    assertAccountCanLogin(user);

    const result = await createOtpSession(normalizedPhone, 'sms', 'password_reset');
    res.json({ message: 'Reset code sent to your phone', ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password/reset', authLimiter, async (req, res, next) => {
  try {
    const { phone, otp, password } = req.body;
    if (!phone || !otp || !password) {
      return res.status(400).json({ error: 'phone, otp, and password are required' });
    }

    const normalizedPhone = normalizePhone(phone);
    await verifyOtpSession(normalizedPhone, otp, 'sms', 'password_reset');
    validatePassword(password);

    const user = await User.findOne({ where: { phone: normalizedPhone } });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    assertAccountCanLogin(user);

    await user.update({ passwordHash: await hashPassword(password) });
    res.json({ message: 'Password reset successful. You can log in with your new password.' });
  } catch (err) {
    next(err);
  }
});

// ─── Push notification device registration ────────────────────────

router.post('/device/register', authenticate, async (req, res, next) => {
  try {
    const { expoPushToken, platform } = req.body;
    if (!expoPushToken) {
      return res.status(400).json({ error: 'expoPushToken required' });
    }
    const device = await registerDevice(req.user.id, expoPushToken, platform);
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

router.post('/device/unregister', authenticate, async (req, res, next) => {
  try {
    const { expoPushToken } = req.body;
    await unregisterDevice(req.user.id, expoPushToken);
    res.json({ message: 'Device unregistered' });
  } catch (err) {
    next(err);
  }
});

export default router;
