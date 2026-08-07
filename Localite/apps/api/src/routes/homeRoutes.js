import { Router } from 'express';
import { UserRole } from '@localite/shared';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getCustomerHome,
  getShopkeeperHome,
  getSuperAdminHome,
  addFavoriteShop,
  removeFavoriteShop,
  listFavoriteShopIds,
} from '../services/homeService.js';

const router = Router();

router.use(authenticate);

router.get('/customer', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const payload = await getCustomerHome(req.user);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get('/shopkeeper', requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const payload = await getShopkeeperHome(req.user);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get('/super-admin', requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { metric, limit } = req.query;
    const payload = await getSuperAdminHome({
      metric: metric || 'revenue',
      limit: limit ? Number(limit) : 10,
    });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get('/favorites', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const shopIds = await listFavoriteShopIds(req.user.id);
    res.json({ shopIds });
  } catch (err) {
    next(err);
  }
});

router.post('/favorites/:shopId', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const result = await addFavoriteShop(req.user.id, req.params.shopId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/favorites/:shopId', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const result = await removeFavoriteShop(req.user.id, req.params.shopId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
