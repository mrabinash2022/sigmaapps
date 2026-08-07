import { Router } from 'express';
import { Offer, PlatformAnnouncement } from '../models/index.js';
import {
  AnnouncementAudience,
  OfferScope,
  UserRole,
} from '@localite/shared';
import { authenticate, requireRole } from '../middleware/auth.js';
import { offerBannerUpload } from '../middleware/offerImageUpload.js';
import {
  buildOfferAttributes,
  listOffers,
  parseOfferBody,
  serializeOffer,
  validateOfferPayload,
} from '../services/offerService.js';
import { invalidateShopListCache } from '../services/cacheService.js';
import { uploadOfferBanner } from '../services/storageService.js';
import { notifyAnnouncementAudience } from '../services/announcementNotificationService.js';

const router = Router();

router.use(authenticate, requireRole(UserRole.SUPER_ADMIN));

function invalidateHomeCaches() {
  invalidateShopListCache();
}

function parseAnnouncementBody(body = {}) {
  return {
    ...body,
    isActive: body.isActive === undefined
      ? undefined
      : body.isActive === true || body.isActive === 'true',
    sendNotification: body.sendNotification === true || body.sendNotification === 'true',
  };
}

router.get('/platform-offers', async (_req, res, next) => {
  try {
    const offers = await listOffers(Offer, { scope: OfferScope.PLATFORM });
    res.json({ offers });
  } catch (err) {
    next(err);
  }
});

router.post('/platform-offers', offerBannerUpload, async (req, res, next) => {
  try {
    const body = parseOfferBody(req.body);
    validateOfferPayload(body);
    let bannerImageUrl = null;
    if (req.file) {
      bannerImageUrl = await uploadOfferBanner(req.file);
    }
    const offer = await Offer.create(buildOfferAttributes({
      ...body,
      bannerImageUrl,
    }, {
      shopId: null,
      createdById: req.user.id,
      scope: OfferScope.PLATFORM,
    }));
    invalidateHomeCaches();
    res.status(201).json({ offer: serializeOffer(offer) });
  } catch (err) {
    next(err);
  }
});

router.patch('/platform-offers/:offerId', offerBannerUpload, async (req, res, next) => {
  try {
    const offer = await Offer.findOne({
      where: { id: req.params.offerId, scope: OfferScope.PLATFORM },
    });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const body = parseOfferBody(req.body);
    validateOfferPayload({ ...offer.toJSON(), ...body });
    let bannerImageUrl = offer.bannerImageUrl;
    if (req.file) {
      bannerImageUrl = await uploadOfferBanner(req.file);
    }
    const attrs = buildOfferAttributes({
      ...offer.toJSON(),
      ...body,
      bannerImageUrl,
    }, {
      shopId: null,
      createdById: req.user.id,
      scope: OfferScope.PLATFORM,
    });
    await offer.update(attrs);
    invalidateHomeCaches();
    res.json({ offer: serializeOffer(offer) });
  } catch (err) {
    next(err);
  }
});

router.delete('/platform-offers/:offerId', async (req, res, next) => {
  try {
    const deleted = await Offer.destroy({
      where: { id: req.params.offerId, scope: OfferScope.PLATFORM },
    });
    if (!deleted) return res.status(404).json({ error: 'Offer not found' });
    invalidateHomeCaches();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/announcements', async (_req, res, next) => {
  try {
    const announcements = await PlatformAnnouncement.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
});

router.post('/announcements', async (req, res, next) => {
  try {
    const { title, body, audience, isActive, startsAt, endsAt, sendNotification } = parseAnnouncementBody(req.body);
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const announcement = await PlatformAnnouncement.create({
      title: title.trim(),
      body: body.trim(),
      audience: audience || AnnouncementAudience.SHOPKEEPERS,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      createdById: req.user.id,
    });

    let notification = null;
    if (sendNotification !== false && announcement.isActive) {
      notification = await notifyAnnouncementAudience(announcement);
    }

    res.status(201).json({ announcement, notification });
  } catch (err) {
    next(err);
  }
});

router.patch('/announcements/:id', async (req, res, next) => {
  try {
    const announcement = await PlatformAnnouncement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    const parsed = parseAnnouncementBody(req.body);
    const wasActive = announcement.isActive;
    const { title, body, audience, isActive, startsAt, endsAt, sendNotification } = parsed;

    await announcement.update({
      title: title?.trim() ?? announcement.title,
      body: body?.trim() ?? announcement.body,
      audience: audience ?? announcement.audience,
      isActive: isActive !== undefined ? Boolean(isActive) : announcement.isActive,
      startsAt: startsAt !== undefined ? startsAt : announcement.startsAt,
      endsAt: endsAt !== undefined ? endsAt : announcement.endsAt,
    });

    let notification = null;
    const shouldNotify = sendNotification || (!wasActive && announcement.isActive);
    if (shouldNotify && announcement.isActive) {
      notification = await notifyAnnouncementAudience(announcement);
    }

    res.json({ announcement, notification });
  } catch (err) {
    next(err);
  }
});

router.delete('/announcements/:id', async (req, res, next) => {
  try {
    const deleted = await PlatformAnnouncement.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
