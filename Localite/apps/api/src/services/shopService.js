import { Op } from 'sequelize';
import { ShopOperationalStatus, ShopStatus, UserAccountStatus, UserRole } from '@localite/shared';
import { isShopOrderable } from '@localite/shared';
import { hashPassword } from './cryptoService.js';
import { normalizePhone } from './userService.js';
export { isShopOrderable };

const SHOP_CODE_PATTERN = /^SHOP(\d{4})-/i;

export function formatShopNameSlug(name) {
  return (name || 'STORE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'STORE';
}

export function buildShopCode(sequence, name) {
  const seq = String(sequence).padStart(4, '0');
  return `SHOP${seq}-${formatShopNameSlug(name)}`;
}

export async function getNextShopSequence(Shop) {
  const shops = await Shop.findAll({
    attributes: ['shopCode'],
    where: { shopCode: { [Op.iLike]: 'SHOP%' } },
  });

  let max = 0;
  for (const shop of shops) {
    const match = shop.shopCode?.match(SHOP_CODE_PATTERN);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max + 1;
}

export async function allocateShopCode(Shop, name, excludeShopId = null) {
  let sequence = await getNextShopSequence(Shop);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = buildShopCode(sequence, name);
    const where = { shopCode: code };
    if (excludeShopId) where.id = { [Op.ne]: excludeShopId };

    const existing = await Shop.findOne({ where });
    if (!existing) return code;
    sequence += 1;
  }

  throw new Error('Unable to allocate unique shop code');
}

export async function shopCodeForName(Shop, shop, name) {
  const match = shop.shopCode?.match(SHOP_CODE_PATTERN);
  if (match) {
    const prefix = `SHOP${match[1]}`;
    const code = `${prefix}-${formatShopNameSlug(name)}`;
    const clash = await Shop.findOne({
      where: { shopCode: code, id: { [Op.ne]: shop.id } },
    });
    if (!clash) return code;
  }
  return allocateShopCode(Shop, name, shop.id);
}

/** @deprecated use allocateShopCode */
export async function generateShopCode(Shop, name = 'STORE') {
  return allocateShopCode(Shop, name);
}

export async function migrateShopCodes(Shop) {
  const shops = await Shop.findAll({ order: [['createdAt', 'ASC']] });
  let migrated = 0;

  for (const shop of shops) {
    if (SHOP_CODE_PATTERN.test(shop.shopCode || '')) continue;
    const code = await allocateShopCode(Shop, shop.name, shop.id);
    await shop.update({ shopCode: code });
    migrated += 1;
  }

  return migrated;
}

export async function findOwnerByPhone(User, phone) {
  return User.findOne({ where: { phone } });
}

export async function linkInvitedShopToUser(shop, user) {
  if (shop.status !== ShopStatus.INVITED) return shop;
  if (shop.appliedById) return shop;
  if (shop.invitedOwnerPhone !== user.phone) return shop;
  await shop.update({ appliedById: user.id });
  return shop;
}

export function shopListIncludes() {
  return [
    { association: 'area', attributes: ['id', 'name', 'city'] },
    { association: 'applicant', attributes: ['id', 'name', 'phone', 'email'] },
    {
      association: 'staff',
      attributes: ['id', 'name', 'phone'],
      through: { attributes: ['role'] },
    },
  ];
}

export function defaultOperationalStatusForApproval() {
  return ShopOperationalStatus.ENABLED;
}

export async function findShopsForAdmin(Shop, ShopUser, user) {
  const links = await ShopUser.findAll({
    where: { userId: user.id },
    attributes: ['shopId'],
  });
  const linkedShopIds = links.map((link) => link.shopId);

  const orConditions = [
    { appliedById: user.id },
    { invitedOwnerPhone: user.phone },
  ];
  if (linkedShopIds.length) {
    orConditions.push({ id: { [Op.in]: linkedShopIds } });
  }

  return Shop.findAll({
    where: { [Op.or]: orConditions },
    include: [{ association: 'area', attributes: ['id', 'name', 'city'] }],
    order: [['createdAt', 'DESC']],
  });
}

export async function linkShopOwner(Shop, ShopUser, shop, user, { setApplicant = true } = {}) {
  await ShopUser.findOrCreate({
    where: { userId: user.id, shopId: shop.id },
    defaults: { role: 'owner' },
  });

  if (setApplicant) {
    await shop.update({
      appliedById: user.id,
      ownerName: user.name,
      phone: user.phone,
      status: ShopStatus.APPROVED,
      operationalStatus: ShopOperationalStatus.ENABLED,
      isVerified: true,
      approvedAt: shop.approvedAt || new Date(),
    });
  }

  return shop;
}

/** Create or update an admin user for a shop's owner phone and link them as owner. */
export async function ensureShopOwnerUser(User, Shop, ShopUser, shop, {
  defaultPassword = 'Admin@12345',
  setApplicant = false,
} = {}) {
  const phone = normalizePhone(shop.phone);
  if (!phone) return null;

  const now = new Date();
  const email = `owner.${phone}@localite.dev`;
  let user = await User.findOne({ where: { phone } });

  if (!user) {
    user = await User.create({
      phone,
      name: shop.ownerName || shop.name,
      username: phone,
      email,
      passwordHash: await hashPassword(defaultPassword),
      role: UserRole.ADMIN,
      address: shop.address,
      areaId: shop.areaId,
      isOnboarded: true,
      phoneVerifiedAt: now,
      emailVerifiedAt: now,
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
    });
  } else {
    await user.update({
      role: UserRole.ADMIN,
      name: shop.ownerName || user.name,
      areaId: shop.areaId || user.areaId,
      address: shop.address || user.address,
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
      isOnboarded: true,
    });
  }

  await linkShopOwner(Shop, ShopUser, shop, user, { setApplicant });
  return user;
}

/** Ensure every shop has a linked owner user account. */
export async function syncShopOwnerUsers(User, Shop, ShopUser, {
  defaultPassword = 'Admin@12345',
} = {}) {
  const shops = await Shop.findAll({
    where: { status: { [Op.in]: [ShopStatus.APPROVED, ShopStatus.PENDING, ShopStatus.INVITED] } },
    order: [['createdAt', 'ASC']],
  });

  let synced = 0;
  for (const shop of shops) {
    if (!shop.phone) continue;
    await ensureShopOwnerUser(User, Shop, ShopUser, shop, { defaultPassword, setApplicant: false });
    synced += 1;
  }
  return synced;
}
