import { Router } from 'express';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
import { UserRole } from '@localite/shared';
import {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
  getWishlistItemIds,
} from '../services/wishlistService.js';

const router = Router();

router.get('/', authenticate, requireRole(UserRole.CUSTOMER), requireOnboarded, async (req, res, next) => {
  try {
    const items = await listWishlist(req.user.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get('/ids', authenticate, requireRole(UserRole.CUSTOMER), requireOnboarded, async (req, res, next) => {
  try {
    const catalogItemIds = await getWishlistItemIds(req.user.id, req.query.shopId);
    res.json({ catalogItemIds });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireRole(UserRole.CUSTOMER), requireOnboarded, async (req, res, next) => {
  try {
    const { catalogItemId } = req.body;
    if (!catalogItemId) return res.status(400).json({ error: 'catalogItemId is required' });
    const item = await addToWishlist(req.user.id, catalogItemId);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

router.delete('/:catalogItemId', authenticate, requireRole(UserRole.CUSTOMER), requireOnboarded, async (req, res, next) => {
  try {
    await removeFromWishlist(req.user.id, req.params.catalogItemId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
