import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { UserRole } from '@localite/shared';
import { getPlatformAnalytics, getShopInsights } from '../services/analyticsService.js';
import { ShopUser } from '../models/index.js';

const router = Router();

router.get('/platform', authenticate, requireRole(UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const analytics = await getPlatformAnalytics({ days });
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

router.get('/shop/:shopId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      const link = await ShopUser.findOne({ where: { userId: req.user.id, shopId: req.params.shopId } });
      if (!link) return res.status(403).json({ error: 'Not your shop' });
    }
    const days = Number(req.query.days) || 30;
    const insights = await getShopInsights(req.params.shopId, { days });
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

export default router;
