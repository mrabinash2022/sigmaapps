import { Router } from 'express';
import { Offer, Shop } from '../models/index.js';
import { OfferScope, ShopStatus, UserRole } from '@localite/shared';
import { authenticate, requireRole, requireShopAccess } from '../middleware/auth.js';
import { offerBannerUpload } from '../middleware/offerImageUpload.js';
import {
  buildOfferAttributes,
  listOffers,
  parseOfferBody,
  serializeOffer,
  validateOfferPayload,
} from '../services/offerService.js';
import { upsertStoreInfo, serializeStoreInfo } from '../services/storeInfoService.js';
import { ShopStoreInfo } from '../models/index.js';
import { invalidateShopListCache } from '../services/cacheService.js';
import { uploadOfferBanner } from '../services/storageService.js';

const router = Router();

async function getOwnerShop(shopId) {
  const shop = await Shop.findByPk(shopId);
  if (!shop || shop.status !== ShopStatus.APPROVED) {
    const err = new Error('Shop not found');
    err.statusCode = 404;
    throw err;
  }
  return shop;
}

function invalidateHomeCaches() {
  invalidateShopListCache();
}

router.get(
  '/my/:shopId/store-info',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
      const info = await ShopStoreInfo.findByPk(req.params.shopId);
      res.json({ storeInfo: serializeStoreInfo(info) });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/my/:shopId/store-info',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
      const storeInfo = await upsertStoreInfo(ShopStoreInfo, req.params.shopId, req.body);
      invalidateHomeCaches();
      res.json({ storeInfo });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/my/:shopId/offers',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
      const offers = await listOffers(Offer, { shopId: req.params.shopId, scope: OfferScope.SHOP });
      res.json({ offers });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/my/:shopId/offers',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  offerBannerUpload,
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
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
        shopId: req.params.shopId,
        createdById: req.user.id,
        scope: OfferScope.SHOP,
      }));
      invalidateHomeCaches();
      res.status(201).json({ offer: serializeOffer(offer) });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/my/:shopId/offers/:offerId',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  offerBannerUpload,
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
      const offer = await Offer.findOne({
        where: { id: req.params.offerId, shopId: req.params.shopId, scope: OfferScope.SHOP },
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
        shopId: req.params.shopId,
        createdById: req.user.id,
        scope: OfferScope.SHOP,
      });
      await offer.update(attrs);
      invalidateHomeCaches();
      res.json({ offer: serializeOffer(offer) });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/my/:shopId/offers/:offerId',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
      const deleted = await Offer.destroy({
        where: { id: req.params.offerId, shopId: req.params.shopId, scope: OfferScope.SHOP },
      });
      if (!deleted) return res.status(404).json({ error: 'Offer not found' });
      invalidateHomeCaches();
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
