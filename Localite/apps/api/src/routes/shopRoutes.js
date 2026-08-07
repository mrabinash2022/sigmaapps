import { Router } from 'express';
import { Op } from 'sequelize';
import { Shop, ShopUser, Area, ShopCatalogItem } from '../models/index.js';
import sequelize from '../database.js';
import { ShopOperationalStatus, ShopStatus, UserRole, CatalogPublishStatus } from '@localite/shared';
import { isShopPubliclyListed } from '@localite/shared';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getShopCatalog } from '../services/catalogService.js';
import catalogManageRoutes from './catalogManageRoutes.js';
import shopHomeManageRoutes from './shopHomeManageRoutes.js';
import { attachShopPublicInfo } from '../services/homeService.js';
import { linkInvitedShopToUser, allocateShopCode, shopCodeForName, findShopsForAdmin } from '../services/shopService.js';
import { notifySuperAdminsNewShopRequest } from '../services/shopNotificationService.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { cacheKey, CacheTTL, getCached } from '../services/cacheService.js';

const router = Router();

router.use(catalogManageRoutes);
router.use(shopHomeManageRoutes);

router.get('/area/:areaId', async (req, res, next) => {
  try {
    const { category } = req.query;
    const { page, limit, offset } = parsePagination(req);
    const listKey = cacheKey(
      'shops', 'area', req.params.areaId,
      category || 'all', String(page), String(limit),
    );

    const payload = await getCached(listKey, CacheTTL.SHOPS_BY_AREA_MS, async () => {
      const where = {
        areaId: req.params.areaId,
        status: ShopStatus.APPROVED,
        operationalStatus: ShopOperationalStatus.ENABLED,
        isVerified: true,
      };
      if (category) where.category = category;

      const { rows, count } = await Shop.findAndCountAll({
        where,
        order: [['rank', 'ASC'], ['name', 'ASC']],
        attributes: { exclude: ['appliedById', 'approvedById', 'rejectionReason', 'invitedOwnerPhone'] },
        limit,
        offset,
      });

      const shopIds = rows.map((s) => s.id);
      let catalogCounts = {};
      if (shopIds.length) {
        const counts = await ShopCatalogItem.findAll({
          attributes: ['shopId', [sequelize.fn('COUNT', sequelize.col('id')), 'catalogItemCount']],
          where: {
            shopId: shopIds,
            isAvailable: true,
            publishStatus: CatalogPublishStatus.PUBLISHED,
          },
          group: ['shopId'],
          raw: true,
        });
        catalogCounts = Object.fromEntries(
          counts.map((row) => [row.shopId, Number(row.catalogItemCount)]),
        );
      }

      const items = rows.map((shop) => ({
        ...shop.toJSON(),
        catalogItemCount: catalogCounts[shop.id] || 0,
      }));

      const enriched = await attachShopPublicInfo(items);
      return paginatedResponse(enriched, { total: count, page, limit });
    });

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get('/:shopId/catalog', async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const payload = await getCached(cacheKey('catalog', shopId), CacheTTL.SHOP_CATALOG_MS, async () => {
      const shop = await Shop.findByPk(shopId, {
        attributes: ['id', 'name', 'category', 'status', 'operationalStatus', 'isVerified', 'visualCatalogEnabled'],
      });
      if (!shop || !isShopPubliclyListed(shop)) {
        const err = new Error('Shop not found');
        err.statusCode = 404;
        throw err;
      }
      const catalog = await getShopCatalog(shop);
      return { shop: { id: shop.id, name: shop.name, category: shop.category }, ...catalog };
    });
    res.json(payload);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

router.get('/:shopId', async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.params.shopId, {
      include: [{ association: 'area', attributes: ['id', 'name', 'city'] }],
      attributes: { exclude: ['appliedById', 'approvedById', 'rejectionReason', 'invitedOwnerPhone'] },
    });
    if (!shop || !isShopPubliclyListed(shop)) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

router.post('/apply', authenticate, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const { name, category, address, phone, itemTypes, description, areaId, latitude, longitude } = req.body;
    if (!name || !category || !address || !phone || !areaId) {
      return res.status(400).json({ error: 'name, category, address, phone, areaId are required' });
    }

    const area = await Area.findByPk(areaId);
    if (!area) return res.status(404).json({ error: 'Area not found' });

    const existing = await Shop.findOne({
      where: { appliedById: req.user.id, status: ShopStatus.PENDING },
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending shop application' });
    }

    const shopCode = await allocateShopCode(Shop, name);

    const shop = await Shop.create({
      shopCode,
      name,
      category,
      address,
      phone,
      itemTypes,
      description,
      areaId,
      latitude: latitude || null,
      longitude: longitude || null,
      ownerName: req.user.name,
      appliedById: req.user.id,
      status: ShopStatus.PENDING,
      operationalStatus: ShopOperationalStatus.DISABLED,
      isVerified: false,
    });

    res.status(201).json({ shop, message: 'Shop application submitted. Awaiting super admin approval.' });
    await notifySuperAdminsNewShopRequest(shop, req.user).catch((err) => {
      console.error('Failed to notify super admins:', err.message);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my/invitations', authenticate, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const shops = await Shop.findAll({
      where: {
        status: ShopStatus.INVITED,
        [Op.or]: [
          { appliedById: req.user.id },
          { invitedOwnerPhone: req.user.phone },
        ],
      },
      include: [{ association: 'area', attributes: ['id', 'name', 'city'] }],
      order: [['createdAt', 'DESC']],
    });

    await Promise.all(shops.map((shop) => linkInvitedShopToUser(shop, req.user)));
    res.json({ shops });
  } catch (err) {
    next(err);
  }
});

router.post('/:shopId/complete-registration', authenticate, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (shop.status !== ShopStatus.INVITED) {
      return res.status(400).json({ error: 'Shop is not awaiting registration' });
    }

    const isOwner =
      shop.appliedById === req.user.id || shop.invitedOwnerPhone === req.user.phone;
    if (!isOwner) return res.status(403).json({ error: 'Not your shop invitation' });

    const { name, category, address, phone, itemTypes, description, areaId, latitude, longitude } = req.body;
    if (!name || !category || !address || !phone || !areaId) {
      return res.status(400).json({ error: 'name, category, address, phone, areaId are required' });
    }

    const area = await Area.findByPk(areaId);
    if (!area) return res.status(404).json({ error: 'Area not found' });

    const shopCode = await shopCodeForName(Shop, shop, name);

    await shop.update({
      name,
      category,
      address,
      phone,
      itemTypes,
      description,
      areaId,
      latitude: latitude || null,
      longitude: longitude || null,
      ownerName: req.user.name,
      appliedById: req.user.id,
      shopCode,
      status: ShopStatus.PENDING,
      operationalStatus: ShopOperationalStatus.DISABLED,
      isVerified: false,
    });

    res.json({
      shop,
      message: 'Shop details submitted. Awaiting super admin approval.',
    });
    await notifySuperAdminsNewShopRequest(shop, req.user).catch((err) => {
      console.error('Failed to notify super admins:', err.message);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my/application', authenticate, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const shops = await findShopsForAdmin(Shop, ShopUser, req.user);
    res.json({ shops });
  } catch (err) {
    next(err);
  }
});

router.patch('/my/:shopId', authenticate, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const link = await ShopUser.findOne({
      where: { userId: req.user.id, shopId: req.params.shopId },
    });
    if (!link) return res.status(403).json({ error: 'Not your shop' });

    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop || shop.status !== ShopStatus.APPROVED) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const { phone, address, itemTypes, description } = req.body;
    const updates = {};
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (itemTypes !== undefined) updates.itemTypes = itemTypes;
    if (description !== undefined) updates.description = description;

    await shop.update(updates);
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

export default router;
