import { Router } from 'express';
import { Op } from 'sequelize';
import { Shop, ShopUser, Area, User, Order } from '../models/index.js';
import { ShopOperationalStatus, ShopStatus, UserAccountStatus, UserRole } from '@localite/shared';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sanitizeUser, hashPassword, validatePassword } from '../services/cryptoService.js';
import { sendPushToUser } from '../services/notificationService.js';
import { revokeAllUserTokens } from '../services/tokenService.js';
import { isValidEmail, normalizeEmail, normalizePhone } from '../services/userService.js';import {
  notifyShopApproval,
  notifyShopRejection,
  notifySuperAdminsNewShopRequest,
} from '../services/shopNotificationService.js';
import {
  allocateShopCode,
  defaultOperationalStatusForApproval,
  findOwnerByPhone,
  shopCodeForName,
  shopListIncludes,
} from '../services/shopService.js';
import { ShopCategory } from '@localite/shared';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { invalidateAreasCache, invalidateShopCaches } from '../services/cacheService.js';

const router = Router();

router.use(authenticate, requireRole(UserRole.SUPER_ADMIN));

router.get('/shops/pending', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { rows, count } = await Shop.findAndCountAll({
      where: { status: ShopStatus.PENDING },
      include: shopListIncludes(),
      order: [['createdAt', 'ASC']],
      limit,
      offset,
      distinct: true,
    });
    res.json(paginatedResponse(rows, { total: count, page, limit }));
  } catch (err) {
    next(err);
  }
});

router.patch('/shops/:shopId/approve', async (req, res, next) => {
  try {
    const { rank } = req.body;
    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (shop.status !== ShopStatus.PENDING) {
      return res.status(400).json({ error: 'Shop is not pending approval' });
    }

    const shopCode = await shopCodeForName(Shop, shop, shop.name);

    await shop.update({
      status: ShopStatus.APPROVED,
      isVerified: true,
      operationalStatus: defaultOperationalStatusForApproval(),
      rank: rank || 10,
      approvedById: req.user.id,
      approvedAt: new Date(),
      shopCode,
    });

    if (shop.appliedById) {
      await ShopUser.findOrCreate({
        where: { shopId: shop.id, userId: shop.appliedById },
        defaults: { role: 'owner' },
      });
      await User.update({ role: UserRole.ADMIN }, { where: { id: shop.appliedById } });
      const applicant = await User.findByPk(shop.appliedById);
      await notifyShopApproval(shop, applicant);
    }

    invalidateShopCaches(shop);
    res.json({ shop, message: 'Shop approved and owner linked' });
  } catch (err) {
    next(err);
  }
});

router.patch('/shops/:shopId/reject', async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (shop.status !== ShopStatus.PENDING) {
      return res.status(400).json({ error: 'Shop is not pending approval' });
    }

    const reason = rejectionReason || 'Application rejected';
    await shop.update({
      status: ShopStatus.REJECTED,
      operationalStatus: ShopOperationalStatus.DISABLED,
      rejectionReason: reason,
      approvedById: req.user.id,
    });

    if (shop.appliedById) {
      const applicant = await User.findByPk(shop.appliedById);
      await notifyShopRejection(shop, applicant, reason);
    }

    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

router.get('/shops', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { rows, count } = await Shop.findAndCountAll({
      include: shopListIncludes(),
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });
    res.json(paginatedResponse(rows, { total: count, page, limit }));
  } catch (err) {
    next(err);
  }
});

router.post('/shops/invite', async (req, res, next) => {
  try {
    const { name, ownerPhone, areaId } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!ownerPhone?.trim()) {
      return res.status(400).json({ error: 'ownerPhone is required' });
    }
    if (!areaId) {
      return res.status(400).json({ error: 'areaId is required' });
    }

    const area = await Area.findByPk(areaId);
    if (!area) return res.status(404).json({ error: 'Area not found' });

    const code = await allocateShopCode(Shop, name.trim());
    const owner = await findOwnerByPhone(User, ownerPhone.trim());
    const shop = await Shop.create({
      shopCode: code,
      name: name.trim(),
      category: ShopCategory.GROCERY,
      ownerName: owner?.name || 'Pending registration',
      phone: ownerPhone.trim(),
      address: 'Pending registration',
      areaId,
      status: ShopStatus.INVITED,
      operationalStatus: ShopOperationalStatus.DISABLED,
      isVerified: false,
      invitedOwnerPhone: ownerPhone.trim(),
      appliedById: owner?.id || null,
      approvedById: req.user.id,
    });

    if (owner) {
      await User.update({ role: UserRole.ADMIN }, { where: { id: owner.id } });
      await sendPushToUser(owner.id, {
        title: 'Shop invitation',
        body: `You have been invited to register shop ${code}. Open Localite to complete setup.`,
        data: { type: 'shop_invite', shopId: shop.id, shopCode: code },
      });
    }

    res.status(201).json({
      shop,
      message: owner
        ? 'Shop created and keeper notified'
        : 'Shop created. Keeper will see the invite after registering with this phone number.',
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/shops/:shopId', async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const { name, category, address, phone, itemTypes, description, areaId, rank, ownerName } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (itemTypes !== undefined) updates.itemTypes = itemTypes;
    if (description !== undefined) updates.description = description;
    if (rank !== undefined) updates.rank = rank;
    if (ownerName !== undefined) updates.ownerName = ownerName;

    if (areaId !== undefined) {
      const area = await Area.findByPk(areaId);
      if (!area) return res.status(404).json({ error: 'Area not found' });
      updates.areaId = areaId;
    }

    if (name !== undefined) {
      updates.shopCode = await shopCodeForName(Shop, shop, name);
    }

    await shop.update(updates);
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

router.patch('/shops/:shopId/operational-status', async (req, res, next) => {
  try {
    const { operationalStatus } = req.body;
    if (!Object.values(ShopOperationalStatus).includes(operationalStatus)) {
      return res.status(400).json({ error: 'Invalid operational status' });
    }

    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (shop.status !== ShopStatus.APPROVED) {
      return res.status(400).json({ error: 'Only approved shops can change operational status' });
    }

    await shop.update({ operationalStatus });

    invalidateShopCaches(shop);

    if (shop.appliedById) {
      const statusLabel = operationalStatus.replace('_', ' ');
      await sendPushToUser(shop.appliedById, {
        title: 'Shop status updated',
        body: `Your shop "${shop.name}" is now ${statusLabel}.`,
        data: { type: 'shop_status', shopId: shop.id, operationalStatus },
      });
    }

    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

router.delete('/shops/:shopId', async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const orderCount = await Order.count({ where: { shopId: shop.id } });
    if (orderCount > 0) {
      return res.status(400).json({ error: 'Cannot delete shop with existing orders' });
    }

    await ShopUser.destroy({ where: { shopId: shop.id } });
    await shop.destroy();
    res.json({ message: 'Shop deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/shops', async (req, res, next) => {
  try {
    const { name, category, address, phone, itemTypes, description, areaId, ownerUserId, rank, shopCode } = req.body;
    if (!name || !category || !address || !phone || !areaId) {
      return res.status(400).json({ error: 'name, category, address, phone, areaId required' });
    }

    const code = await allocateShopCode(Shop, name);

    const shop = await Shop.create({
      shopCode: code,
      name,
      category,
      address,
      phone,
      itemTypes,
      description,
      areaId,
      ownerName: req.body.ownerName || 'Owner',
      status: ShopStatus.APPROVED,
      operationalStatus: defaultOperationalStatusForApproval(),
      isVerified: true,
      rank: rank || 10,
      appliedById: ownerUserId || null,
      approvedById: req.user.id,
      approvedAt: new Date(),
    });

    if (ownerUserId) {
      await ShopUser.findOrCreate({
        where: { shopId: shop.id, userId: ownerUserId },
        defaults: { role: 'owner' },
      });
      await User.update({ role: UserRole.ADMIN }, { where: { id: ownerUserId } });
    }

    res.status(201).json({ shop });
  } catch (err) {
    next(err);
  }
});

router.post('/areas', async (req, res, next) => {
  try {
    const { name, city } = req.body;
    if (!name || !city) return res.status(400).json({ error: 'name and city required' });
    const area = await Area.create({ name, city, isActive: true });
    invalidateAreasCache();
    res.status(201).json({ area });
  } catch (err) {
    next(err);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { name, phone, email, password, address, areaId, role } = req.body;
    if (!name?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ error: 'name, phone, and password are required' });
    }
    validatePassword(password);

    const requestedRole = role === UserRole.CUSTOMER ? UserRole.CUSTOMER : UserRole.ADMIN;
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = email ? normalizeEmail(email) : null;

    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const phoneConflict = await User.findOne({ where: { phone: normalizedPhone } });
    if (phoneConflict) {
      return res.status(409).json({ error: 'This mobile number is already registered' });
    }

    if (normalizedEmail) {
      const emailConflict = await User.findOne({ where: { email: normalizedEmail } });
      if (emailConflict) {
        return res.status(409).json({ error: 'This email is already registered' });
      }
    }

    if (areaId) {
      const area = await Area.findByPk(areaId);
      if (!area) return res.status(404).json({ error: 'Area not found' });
    }

    const now = new Date();
    const user = await User.create({
      name: name.trim(),
      phone: normalizedPhone,
      username: normalizedPhone,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      role: requestedRole,
      address: address?.trim() || null,
      areaId: areaId || null,
      isOnboarded: requestedRole === UserRole.CUSTOMER,
      phoneVerifiedAt: now,
      emailVerifiedAt: normalizedEmail ? now : null,
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
    });

    const created = await User.findByPk(user.id, {
      include: [{ association: 'area', attributes: ['id', 'name', 'city'] }],
    });

    const roleLabel = requestedRole === UserRole.ADMIN ? 'Store owner' : 'Customer';
    res.status(201).json({
      user: sanitizeUser(created),
      message: `${roleLabel} created. They can login with phone ${normalizedPhone}.`,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { role, accountStatus } = req.query;
    const { page, limit, offset } = parsePagination(req);
    const where = { role: { [Op.ne]: UserRole.SUPER_ADMIN } };

    if (role === UserRole.ADMIN) {
      const staffLinks = await ShopUser.findAll({ attributes: ['userId'] });
      const shopOwnerIds = [...new Set(staffLinks.map((link) => link.userId))];
      where[Op.and] = [
        { role: { [Op.ne]: UserRole.SUPER_ADMIN } },
        {
          [Op.or]: [
            { role: UserRole.ADMIN },
            ...(shopOwnerIds.length ? [{ id: { [Op.in]: shopOwnerIds } }] : []),
          ],
        },
      ];
      delete where.role;
    } else if (role && Object.values(UserRole).includes(role) && role !== UserRole.SUPER_ADMIN) {
      where.role = role;
    }

    if (accountStatus && Object.values(UserAccountStatus).includes(accountStatus)) {
      where.accountStatus = accountStatus;
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['passwordHash'] },
      include: [{ association: 'area', attributes: ['id', 'name', 'city'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    res.json(paginatedResponse(rows.map(sanitizeUser), { total: count, page, limit }));
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:userId', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot edit super admin accounts' });
    }

    const { name, email, phone, address, areaId, role } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (areaId !== undefined) {
      if (areaId) {
        const area = await Area.findByPk(areaId);
        if (!area) return res.status(404).json({ error: 'Area not found' });
      }
      updates.areaId = areaId || null;
    }
    if (role !== undefined) {
      if (![UserRole.CUSTOMER, UserRole.ADMIN].includes(role)) {
        return res.status(400).json({ error: 'Role must be customer or admin' });
      }
      updates.role = role;
    }
    if (phone !== undefined) {
      const normalizedPhone = normalizePhone(phone);
      const phoneConflict = await User.findOne({
        where: { phone: normalizedPhone, id: { [Op.ne]: user.id } },
      });
      if (phoneConflict) {
        return res.status(409).json({ error: 'This mobile number is already registered to another user' });
      }
      updates.phone = normalizedPhone;
    }
    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      const emailConflict = await User.findOne({
        where: { email: normalizedEmail, id: { [Op.ne]: user.id } },
      });
      if (emailConflict) {
        return res.status(409).json({ error: 'This email is already registered to another user' });
      }
      updates.email = normalizedEmail;
    }

    await user.update(updates);
    const updated = await User.findByPk(user.id, {
      include: [{ association: 'area', attributes: ['id', 'name', 'city'] }],
    });
    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:userId/account-status', async (req, res, next) => {
  try {
    const { accountStatus } = req.body;
    if (!Object.values(UserAccountStatus).includes(accountStatus)) {
      return res.status(400).json({ error: 'Invalid account status' });
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot change super admin account status' });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own account status' });
    }

    await user.update({
      accountStatus,
      isActive: accountStatus === UserAccountStatus.ENABLED,
    });

    if (accountStatus !== UserAccountStatus.ENABLED) {
      await revokeAllUserTokens(user.id);
    }

    const statusLabel = accountStatus.replace('_', ' ');
    await sendPushToUser(user.id, {
      title: 'Account status updated',
      body: `Your Localite account is now ${statusLabel}.`,
      data: { type: 'account_status', accountStatus },
    }).catch(() => {});

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:userId', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot delete super admin accounts' });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const orderCount = await Order.count({ where: { customerId: user.id } });
    if (orderCount > 0) {
      return res.status(400).json({ error: 'Cannot delete user with existing orders' });
    }

    await revokeAllUserTokens(user.id);
    await ShopUser.destroy({ where: { userId: user.id } });
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:userId/role', async (req, res, next) => {  try {
    const { role } = req.body;
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ role });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
