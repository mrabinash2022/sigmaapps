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
  updateCampaign,
} from '../services/bulkBuyService.js';
import {
  acceptStoreOffer,
  closeCampaign,
  confirmTokenPayment,
  createTokenPaymentOrder,
  listOfferCommitments,
  markCommitmentCompleted,
  setVisitPollDates,
  submitTokenPayment,
  verifyTokenPayment,
  voteVisitPoll,
  withdrawOfferAcceptance,
} from '../services/bulkBuyCommitmentService.js';

const router = Router();

router.use(authenticate, requireOnboarded);

router.get('/campaigns', async (req, res, next) => {
  try {
    const areaId = req.query.areaId || req.user.areaId;
    if (!areaId) return res.status(400).json({ error: 'areaId is required' });
    const campaigns = await listCampaignsForArea(areaId, req.user);
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
    const campaign = await getCampaignById(req.params.campaignId, req.user);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.patch('/campaigns/:campaignId', async (req, res, next) => {
  try {
    const campaign = await updateCampaign(req.user, req.params.campaignId, req.body);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.patch('/campaigns/:campaignId/close', async (req, res, next) => {
  try {
    const campaign = await closeCampaign(req.user, req.params.campaignId, { reason: req.body?.reason });
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.patch('/campaigns/:campaignId/visit-poll', async (req, res, next) => {
  try {
    const { visitPollDates } = req.body;
    const campaign = await setVisitPollDates(req.user, req.params.campaignId, visitPollDates);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:campaignId/visit-poll/vote', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const { pollDate } = req.body;
    if (!pollDate) return res.status(400).json({ error: 'pollDate is required' });
    const campaign = await voteVisitPoll(req.user, req.params.campaignId, pollDate);
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
    const {
      shopId,
      discountType,
      discountValue,
      extras,
      termsText,
      validUntil,
      tokenAmount,
      proposedDealDay,
    } = req.body;
    if (!shopId) return res.status(400).json({ error: 'shopId is required' });
    const offer = await submitStoreOffer(req.user, req.params.campaignId, shopId, {
      discountType,
      discountValue,
      extras,
      termsText,
      validUntil,
      tokenAmount,
      proposedDealDay,
    });
    res.status(201).json({ offer });
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/:campaignId/offers/:offerId/commitments', async (req, res, next) => {
  try {
    const commitments = await listOfferCommitments(req.user, req.params.campaignId, req.params.offerId);
    res.json({ commitments });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:campaignId/offers/:offerId/accept', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const campaign = await acceptStoreOffer(req.user, req.params.campaignId, req.params.offerId);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.delete('/campaigns/:campaignId/commitment', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const campaign = await withdrawOfferAcceptance(req.user, req.params.campaignId);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:campaignId/commitment/token-order', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const order = await createTokenPaymentOrder(req.user, req.params.campaignId);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:campaignId/commitment/verify-token', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const campaign = await verifyTokenPayment(req.user, req.params.campaignId, req.body);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.patch('/campaigns/:campaignId/commitment/mock-pay-token', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const campaign = await submitTokenPayment(req.user, req.params.campaignId, {
      paymentReference: req.body?.paymentReference,
    });
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.patch('/campaigns/:campaignId/commitments/:participantId/confirm-token', requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const campaign = await confirmTokenPayment(req.user, req.params.campaignId, req.params.participantId);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.patch('/campaigns/:campaignId/commitments/:participantId/complete', async (req, res, next) => {
  try {
    const campaign = await markCommitmentCompleted(req.user, req.params.campaignId, req.params.participantId);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

export default router;
