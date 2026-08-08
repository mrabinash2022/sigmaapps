import { Router } from 'express';
import { UserRole } from '@localite/shared';
import { authenticate, requireOnboarded, requireRole } from '../middleware/auth.js';
import {
  createCampaign,
  getCampaignById,
  listCampaignsForArea,
  listCampaignOffers,
  listMyCampaigns,
  listStoreInbox,
  subscribeToCampaign,
  submitStoreOffer,
  unsubscribeFromCampaign,
} from '../services/bulkBuyService.js';

const router = Router();

router.use(authenticate, requireOnboarded);

router.get('/campaigns', async (req, res, next) => {
  try {
    const areaId = req.query.areaId || req.user.areaId;
    if (!areaId) return res.status(400).json({ error: 'areaId is required' });
    const campaigns = await listCampaignsForArea(areaId, req.user.id);
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns', async (req, res, next) => {
  try {
    const campaign = await createCampaign(req.user, req.body);
    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/inbox', requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const campaigns = await listStoreInbox(req.user);
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/mine', async (req, res, next) => {
  try {
    const campaigns = await listMyCampaigns(req.user);
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/:campaignId', async (req, res, next) => {
  try {
    const campaign = await getCampaignById(req.params.campaignId, req.user.id);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:campaignId/subscribe', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const campaign = await subscribeToCampaign(req.params.campaignId, req.user.id);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.delete('/campaigns/:campaignId/subscribe', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const campaign = await unsubscribeFromCampaign(req.params.campaignId, req.user.id);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/:campaignId/offers', async (req, res, next) => {
  try {
    const offers = await listCampaignOffers(req.params.campaignId);
    res.json({ offers });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:campaignId/offers', requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { shopId, discountType, discountValue, extras, termsText, validUntil } = req.body;
    if (!shopId) return res.status(400).json({ error: 'shopId is required' });
    const offer = await submitStoreOffer(req.user, req.params.campaignId, shopId, {
      discountType,
      discountValue,
      extras,
      termsText,
      validUntil,
    });
    res.status(201).json({ offer });
  } catch (err) {
    next(err);
  }
});

export default router;
