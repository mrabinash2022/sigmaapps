import { Op } from 'sequelize';
import {
  OfferScope,
  OfferAudience,
  DiscountType,
  isOfferActive,
} from '@localite/shared';

export function serializeOffer(offer) {
  if (!offer) return null;
  const json = typeof offer.toJSON === 'function' ? offer.toJSON() : offer;
  return {
    ...json,
    isCurrentlyActive: isOfferActive(json),
  };
}

export function parseOfferBody(body = {}) {
  const parsed = { ...body };
  if (parsed.isActive !== undefined) {
    parsed.isActive = parsed.isActive === true || parsed.isActive === 'true';
  }
  if (parsed.showOnShopPage !== undefined) {
    parsed.showOnShopPage = parsed.showOnShopPage === true || parsed.showOnShopPage === 'true';
  }
  if (parsed.discountValue !== undefined && parsed.discountValue !== '' && parsed.discountValue != null) {
    parsed.discountValue = Number(parsed.discountValue);
  } else if (parsed.discountValue === '') {
    parsed.discountValue = null;
  }
  if (parsed.sortOrder !== undefined && parsed.sortOrder !== '') {
    parsed.sortOrder = Number(parsed.sortOrder);
  }
  return parsed;
}

export function validateOfferPayload(body, { requireShopId = false } = {}) {
  const errors = [];
  if (!body.title?.trim()) errors.push('Title is required');

  if (requireShopId && !body.shopId) {
    errors.push('Shop is required');
  }

  if (body.discountType && !Object.values(DiscountType).includes(body.discountType)) {
    errors.push('Invalid discount type');
  }

  if (body.audience && !Object.values(OfferAudience).includes(body.audience)) {
    errors.push('Invalid audience');
  }

  if (errors.length) {
    const err = new Error(errors.join('. '));
    err.statusCode = 400;
    throw err;
  }
}

export function buildOfferAttributes(body, { shopId, createdById, scope }) {
  return {
    shopId: shopId ?? body.shopId ?? null,
    createdById,
    scope: scope || body.scope || OfferScope.SHOP,
    audience: body.audience || OfferAudience.CUSTOMERS,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    discountType: body.discountType || DiscountType.TEXT,
    discountValue: body.discountValue != null && body.discountValue !== ''
      ? Number(body.discountValue)
      : null,
    bannerImageUrl: body.bannerImageUrl?.trim() || null,
    startsAt: body.startsAt || null,
    endsAt: body.endsAt || null,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
    showOnShopPage: body.showOnShopPage !== undefined ? Boolean(body.showOnShopPage) : true,
  };
}

export async function listOffers(Offer, where = {}, { order } = {}) {
  const rows = await Offer.findAll({
    where,
    order: order || [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
  });
  return rows.map(serializeOffer);
}

export function filterActiveOffers(offers, now = new Date()) {
  return offers.filter((offer) => isOfferActive(offer, now));
}

export async function getActiveShopOffers(Offer, shopIds, {
  limitPerShop = 3,
  audience = OfferAudience.CUSTOMERS,
} = {}) {
  if (!shopIds?.length) return {};

  const rows = await Offer.findAll({
    where: {
      shopId: shopIds,
      scope: OfferScope.SHOP,
      isActive: true,
      showOnShopPage: true,
      audience: { [Op.in]: [audience, OfferAudience.ALL] },
    },
    order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
  });

  const grouped = {};
  for (const row of rows) {
    const offer = serializeOffer(row);
    if (!isOfferActive(offer)) continue;
    if (!grouped[offer.shopId]) grouped[offer.shopId] = [];
    if (grouped[offer.shopId].length < limitPerShop) {
      grouped[offer.shopId].push(offer);
    }
  }
  return grouped;
}

export async function getTopOffersAcrossShops(Offer, Shop, {
  limit = 5,
  areaId,
  audience = OfferAudience.CUSTOMERS,
} = {}) {
  const shopWhere = {};
  if (areaId) shopWhere.areaId = areaId;

  const offers = await Offer.findAll({
    where: {
      scope: OfferScope.SHOP,
      isActive: true,
      showOnShopPage: true,
      audience: { [Op.in]: [audience, OfferAudience.ALL] },
    },
    include: [{
      association: 'shop',
      attributes: ['id', 'name', 'category', 'areaId'],
      where: Object.keys(shopWhere).length ? shopWhere : undefined,
      required: true,
    }],
    order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
    limit: limit * 4,
  });

  const active = filterActiveOffers(offers.map(serializeOffer));
  return active.slice(0, limit);
}

export async function getActivePlatformOffers(Offer, {
  audience = OfferAudience.CUSTOMERS,
  limit = 10,
} = {}) {
  const rows = await Offer.findAll({
    where: {
      scope: OfferScope.PLATFORM,
      isActive: true,
      audience: { [Op.in]: [audience, OfferAudience.ALL] },
    },
    order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
    limit: limit * 2,
  });
  return filterActiveOffers(rows.map(serializeOffer)).slice(0, limit);
}
