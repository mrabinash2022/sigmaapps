import { Op } from 'sequelize';
import { ShopStatus } from '@localite/shared';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

export function normalizePhone(phone) {
  return (phone || '').replace(/\s/g, '').trim();
}

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

export async function assertRegistrationIdentity(User, Shop, { phone, email, username }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedPhone) {
    throw Object.assign(new Error('Phone number is required'), { statusCode: 400 });
  }
  if (!normalizedEmail) {
    throw Object.assign(new Error('Email is required'), { statusCode: 400 });
  }
  if (!isValidEmail(normalizedEmail)) {
    throw Object.assign(new Error('Enter a valid email address'), { statusCode: 400 });
  }

  const userByPhone = await User.findOne({ where: { phone: normalizedPhone } });
  const userByEmail = await User.findOne({ where: { email: normalizedEmail } });

  if (userByPhone && userByEmail && userByPhone.id !== userByEmail.id) {
    throw Object.assign(
      new Error('This mobile number and email are linked to different existing accounts. Please login or contact support.'),
      { statusCode: 409, code: 'IDENTITY_CONFLICT' },
    );
  }

  const existingUser = userByPhone || userByEmail;
  if (existingUser) {
    if (userByPhone && userByPhone.email && normalizeEmail(userByPhone.email) !== normalizedEmail) {
      throw Object.assign(
        new Error('This mobile number is already registered with a different email. Please login with your existing account.'),
        { statusCode: 409, code: 'PHONE_IN_USE' },
      );
    }
    if (userByEmail && userByEmail.phone !== normalizedPhone) {
      throw Object.assign(
        new Error('This email is already registered with a different mobile number. Please login with your existing account.'),
        { statusCode: 409, code: 'EMAIL_IN_USE' },
      );
    }
    throw Object.assign(
      new Error('An account already exists with this mobile number and email. Please login.'),
      { statusCode: 409, code: 'ACCOUNT_EXISTS' },
    );
  }

  if (username) {
    const byUsername = await User.findOne({ where: { username } });
    if (byUsername) {
      throw Object.assign(new Error('Username already taken'), { statusCode: 409 });
    }
  }

  const activeShop = await Shop.findOne({
    where: {
      status: { [Op.in]: [ShopStatus.APPROVED, ShopStatus.PENDING] },
      [Op.or]: [
        { phone: normalizedPhone },
        { invitedOwnerPhone: normalizedPhone },
      ],
    },
  });

  if (activeShop) {
    const label = activeShop.status === ShopStatus.APPROVED ? 'registered' : 'pending approval';
    throw Object.assign(
      new Error(`A store "${activeShop.name}" is already ${label} with this mobile number. Please login or contact the super admin.`),
      { statusCode: 409, code: 'STORE_EXISTS' },
    );
  }

  return { phone: normalizedPhone, email: normalizedEmail };
}
