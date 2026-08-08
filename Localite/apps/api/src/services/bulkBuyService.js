import { Op } from 'sequelize';
import {
  BulkBuyCampaignCreatorType,
  BulkBuyCampaignStatus,
  BulkBuyParticipantStatus,
  BulkBuyProductCategory,
  DEFAULT_BULK_BUY_MIN_SUBSCRIBERS,
  UserRole,
  getBulkBuyProductLabel,
} from '@localite/shared';
import {
  Area,
  BulkBuyCampaign,
  BulkBuyParticipant,
  BulkBuyStoreOffer,
  Shop,
  ShopUser,
} from '../models/index.js';
import {
  notifyBulkBuyOfferPublished,
  notifyBulkBuySubscribersThreshold,
  notifyBulkBuyStoresThreshold,
} from './bulkBuyNotificationService.js';

const ACTIVE_STATUSES = [
  BulkBuyCampaignStatus.COLLECTING,
  BulkBuyCampaignStatus.READY_FOR_OFFERS,
  BulkBuyCampaignStatus.OFFERS_AVAILABLE,
];

export async function countSubscribers(campaignId) {
  return BulkBuyParticipant.count({
    where: { campaignId, status: BulkBuyParticipantStatus.SUBSCRIBED },
  });
}

function serializeOffer(offer) {
  const json = offer.toJSON ? offer.toJSON() : offer;
  return {
    id: json.id,
    campaignId: json.campaignId,
    shopId: json.shopId,
    shop: json.shop ? { id: json.shop.id, name: json.shop.name, address: json.shop.address } : undefined,
    discountType: json.discountType,
    discountValue: json.discountValue != null ? Number(json.discountValue) : null,
    extras: json.extras || {},
    termsText: json.termsText,
    validUntil: json.validUntil,
    createdAt: json.createdAt,
  };
}

export async function serializeCampaign(campaign, { viewer = null } = {}) {
  const json = campaign.toJSON ? campaign.toJSON() : campaign;
  const subscriberCount = await countSubscribers(json.id);
  let isSubscribed = false;
  if (viewer?.id) {
    const row = await BulkBuyParticipant.findOne({
      where: {
        campaignId: json.id,
        customerId: viewer.id,
        status: BulkBuyParticipantStatus.SUBSCRIBED,
      },
    });
    isSubscribed = Boolean(row);
  }

  const offerCount = json.offers?.length ?? await BulkBuyStoreOffer.count({ where: { campaignId: json.id } });
  const canEdit = viewer ? await canUserEditCampaign(viewer, campaign) : false;

  return {
    id: json.id,
    areaId: json.areaId,
    area: json.area ? { id: json.area.id, name: json.area.name, city: json.area.city } : undefined,
    createdByType: json.createdByType,
    createdByCustomer: json.createdByCustomer
      ? { id: json.createdByCustomer.id, name: json.createdByCustomer.name }
      : null,
    createdByShop: json.createdByShop
      ? { id: json.createdByShop.id, name: json.createdByShop.name }
      : null,
    title: json.title,
    productCategory: json.productCategory,
    productCategoryLabel: getBulkBuyProductLabel(json.productCategory),
    description: json.description,
    brandPreference: json.brandPreference,
    minSubscribers: json.minSubscribers,
    subscriberCount,
    status: json.status,
    deadlineAt: json.deadlineAt,
    thresholdReachedAt: json.thresholdReachedAt,
    isSubscribed,
    canEdit,
    offerCount,
    offers: json.offers ? json.offers.map(serializeOffer) : undefined,
    createdAt: json.createdAt,
  };
}

async function getCampaignIncludes() {
  return [
    { association: 'area', attributes: ['id', 'name', 'city'] },
    { association: 'createdByCustomer', attributes: ['id', 'name'] },
    { association: 'createdByShop', attributes: ['id', 'name'] },
  ];
}

async function canUserEditCampaign(user, campaign) {
  const json = campaign.toJSON ? campaign.toJSON() : campaign;
  if (json.status !== BulkBuyCampaignStatus.COLLECTING) return false;

  if (user.role === UserRole.CUSTOMER) {
    return json.createdByCustomerId === user.id;
  }
  if (user.role === UserRole.ADMIN) {
    if (!json.createdByShopId) return false;
    const link = await ShopUser.findOne({ where: { userId: user.id, shopId: json.createdByShopId } });
    return Boolean(link);
  }
  if (user.role === UserRole.SUPER_ADMIN) {
    if (json.createdByCustomerId === user.id) return true;
    if (!json.createdByShopId) return false;
    const link = await ShopUser.findOne({ where: { userId: user.id, shopId: json.createdByShopId } });
    return Boolean(link);
  }
  return false;
}

async function assertShopBulkPartner(user, shopId) {
  if (user.role === UserRole.SUPER_ADMIN) return Shop.findByPk(shopId);
  const link = await ShopUser.findOne({ where: { userId: user.id, shopId } });
  if (!link) {
    const err = new Error('You do not have access to this shop');
    err.statusCode = 403;
    throw err;
  }
  const shop = await Shop.findByPk(shopId);
  if (!shop?.bulkBuyEnabled) {
    const err = new Error('This shop is not enabled for bulk buy');
    err.statusCode = 403;
    throw err;
  }
  return shop;
}

export async function createCampaign(user, payload) {
  const {
    title,
    productCategory,
    description,
    brandPreference,
    minSubscribers,
    deadlineAt,
    areaId,
    shopId,
  } = payload;

  if (!title?.trim()) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }
  if (!Object.values(BulkBuyProductCategory).includes(productCategory)) {
    const err = new Error('Invalid product category');
    err.statusCode = 400;
    throw err;
  }

  const min = Number(minSubscribers) || DEFAULT_BULK_BUY_MIN_SUBSCRIBERS;
  if (min < 2) {
    const err = new Error('Minimum subscribers must be at least 2');
    err.statusCode = 400;
    throw err;
  }

  let createdByType;
  let createdByCustomerId = null;
  let createdByShopId = null;
  let resolvedAreaId = areaId;

  if (user.role === UserRole.CUSTOMER) {
    createdByType = BulkBuyCampaignCreatorType.CUSTOMER;
    createdByCustomerId = user.id;
    resolvedAreaId = areaId || user.areaId;
    if (!resolvedAreaId) {
      const err = new Error('Area is required to start a campaign');
      err.statusCode = 400;
      throw err;
    }
  } else if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
    if (!shopId) {
      const err = new Error('shopId is required for store campaigns');
      err.statusCode = 400;
      throw err;
    }
    const shop = await assertShopBulkPartner(user, shopId);
    createdByType = BulkBuyCampaignCreatorType.STORE;
    createdByShopId = shop.id;
    resolvedAreaId = areaId || shop.areaId;
  } else {
    const err = new Error('Not allowed to create campaigns');
    err.statusCode = 403;
    throw err;
  }

  const area = await Area.findByPk(resolvedAreaId);
  if (!area) {
    const err = new Error('Area not found');
    err.statusCode = 404;
    throw err;
  }

  const campaign = await BulkBuyCampaign.create({
    areaId: resolvedAreaId,
    createdByType,
    createdByCustomerId,
    createdByShopId,
    title: title.trim(),
    productCategory,
    description: description?.trim() || null,
    brandPreference: brandPreference?.trim() || null,
    minSubscribers: min,
    deadlineAt: deadlineAt || null,
    status: BulkBuyCampaignStatus.COLLECTING,
  });

  const full = await BulkBuyCampaign.findByPk(campaign.id, { include: await getCampaignIncludes() });
  return serializeCampaign(full, { viewer: user });
}

export async function updateCampaign(user, campaignId, payload) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  if (!(await canUserEditCampaign(user, campaign))) {
    const err = new Error('You can only edit your own campaigns while they are still collecting interest');
    err.statusCode = 403;
    throw err;
  }

  const {
    title,
    productCategory,
    description,
    brandPreference,
    minSubscribers,
    deadlineAt,
  } = payload;

  const updates = {};

  if (title !== undefined) {
    if (!title?.trim()) {
      const err = new Error('Title is required');
      err.statusCode = 400;
      throw err;
    }
    updates.title = title.trim();
  }
  if (productCategory !== undefined) {
    if (!Object.values(BulkBuyProductCategory).includes(productCategory)) {
      const err = new Error('Invalid product category');
      err.statusCode = 400;
      throw err;
    }
    updates.productCategory = productCategory;
  }
  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }
  if (brandPreference !== undefined) {
    updates.brandPreference = brandPreference?.trim() || null;
  }
  if (deadlineAt !== undefined) {
    updates.deadlineAt = deadlineAt || null;
  }
  if (minSubscribers !== undefined) {
    const min = Number(minSubscribers);
    if (!Number.isFinite(min) || min < 2) {
      const err = new Error('Minimum subscribers must be at least 2');
      err.statusCode = 400;
      throw err;
    }
    const subscriberCount = await countSubscribers(campaignId);
    if (min < subscriberCount) {
      const err = new Error(`Minimum cannot be less than current subscribers (${subscriberCount})`);
      err.statusCode = 400;
      throw err;
    }
    updates.minSubscribers = min;
  }

  if (!Object.keys(updates).length) {
    const err = new Error('No valid fields to update');
    err.statusCode = 400;
    throw err;
  }

  await campaign.update(updates);
  await maybeReachThreshold(campaign);

  return getCampaignById(campaignId, user);
}

export async function listCampaignsForArea(areaId, viewer) {
  const campaigns = await BulkBuyCampaign.findAll({
    where: { areaId, status: { [Op.in]: ACTIVE_STATUSES } },
    include: await getCampaignIncludes(),
    order: [['createdAt', 'DESC']],
  });
  return Promise.all(campaigns.map((c) => serializeCampaign(c, { viewer })));
}

export async function getCampaignById(campaignId, viewer) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId, {
    include: [
      ...(await getCampaignIncludes()),
      {
        association: 'offers',
        include: [{ association: 'shop', attributes: ['id', 'name', 'address', 'phone'] }],
        order: [['createdAt', 'ASC']],
      },
    ],
  });
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  return serializeCampaign(campaign, { viewer });
}

async function maybeReachThreshold(campaign) {
  if (campaign.status !== BulkBuyCampaignStatus.COLLECTING) return campaign;

  const subscriberCount = await countSubscribers(campaign.id);
  if (subscriberCount < campaign.minSubscribers) return campaign;

  await campaign.update({
    status: BulkBuyCampaignStatus.READY_FOR_OFFERS,
    thresholdReachedAt: new Date(),
  });

  const full = await BulkBuyCampaign.findByPk(campaign.id, {
    include: await getCampaignIncludes(),
  });

  await notifyBulkBuySubscribersThreshold(full, subscriberCount).catch(() => {});
  await notifyBulkBuyStoresThreshold(full, subscriberCount).catch(() => {});

  return full;
}

export async function subscribeToCampaign(campaignId, customerId) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  if (![BulkBuyCampaignStatus.COLLECTING].includes(campaign.status)) {
    const err = new Error('This campaign is no longer accepting subscribers');
    err.statusCode = 400;
    throw err;
  }

  const [participant, created] = await BulkBuyParticipant.findOrCreate({
    where: { campaignId, customerId },
    defaults: { status: BulkBuyParticipantStatus.SUBSCRIBED },
  });

  if (!created && participant.status === BulkBuyParticipantStatus.WITHDRAWN) {
    await participant.update({ status: BulkBuyParticipantStatus.SUBSCRIBED });
  }

  await maybeReachThreshold(campaign);
  return getCampaignById(campaignId, { id: customerId, role: UserRole.CUSTOMER });
}

export async function unsubscribeFromCampaign(campaignId, customerId) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  if (campaign.status !== BulkBuyCampaignStatus.COLLECTING) {
    const err = new Error('Cannot withdraw after the campaign reached its threshold');
    err.statusCode = 400;
    throw err;
  }

  const participant = await BulkBuyParticipant.findOne({ where: { campaignId, customerId } });
  if (!participant || participant.status === BulkBuyParticipantStatus.WITHDRAWN) {
    const err = new Error('You are not subscribed to this campaign');
    err.statusCode = 400;
    throw err;
  }

  await participant.update({ status: BulkBuyParticipantStatus.WITHDRAWN });
  return getCampaignById(campaignId, { id: customerId, role: UserRole.CUSTOMER });
}

export async function listStoreInbox(user) {
  const shopLinks = await ShopUser.findAll({
    where: { userId: user.id },
    include: [{ model: Shop, as: 'shop', where: { bulkBuyEnabled: true } }],
  });
  const areaIds = [...new Set(shopLinks.map((l) => l.shop?.areaId).filter(Boolean))];
  if (!areaIds.length && user.role !== UserRole.SUPER_ADMIN) return [];

  const where = {
    status: { [Op.in]: [BulkBuyCampaignStatus.READY_FOR_OFFERS, BulkBuyCampaignStatus.OFFERS_AVAILABLE] },
  };
  if (user.role !== UserRole.SUPER_ADMIN) {
    where.areaId = { [Op.in]: areaIds };
  }

  const campaigns = await BulkBuyCampaign.findAll({
    where,
    include: await getCampaignIncludes(),
    order: [['thresholdReachedAt', 'DESC']],
  });

  return Promise.all(campaigns.map((c) => serializeCampaign(c, { viewer: user })));
}

export async function listMyCampaigns(user) {
  const where = {};
  if (user.role === UserRole.CUSTOMER) {
    where.createdByCustomerId = user.id;
  } else {
    const links = await ShopUser.findAll({ where: { userId: user.id } });
    const shopIds = links.map((l) => l.shopId);
    if (!shopIds.length) return [];
    where.createdByShopId = { [Op.in]: shopIds };
  }

  const campaigns = await BulkBuyCampaign.findAll({
    where,
    include: await getCampaignIncludes(),
    order: [['createdAt', 'DESC']],
  });
  return Promise.all(campaigns.map((c) => serializeCampaign(c, { viewer: user })));
}

export async function submitStoreOffer(user, campaignId, shopId, payload) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId, { include: await getCampaignIncludes() });
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  if (![BulkBuyCampaignStatus.READY_FOR_OFFERS, BulkBuyCampaignStatus.OFFERS_AVAILABLE].includes(campaign.status)) {
    const err = new Error('This campaign is not accepting store offers');
    err.statusCode = 400;
    throw err;
  }

  await assertShopBulkPartner(user, shopId);

  const shop = await Shop.findByPk(shopId);
  if (shop.areaId !== campaign.areaId) {
    const err = new Error('Your shop is not in the same area as this campaign');
    err.statusCode = 400;
    throw err;
  }

  const {
    discountType = 'percent',
    discountValue,
    extras = {},
    termsText,
    validUntil,
  } = payload;

  const offerPayload = {
    campaignId,
    shopId,
    discountType,
    discountValue: discountValue ?? null,
    extras,
    termsText: termsText?.trim() || null,
    validUntil: validUntil || null,
    submittedByUserId: user.id,
  };

  const existing = await BulkBuyStoreOffer.findOne({ where: { campaignId, shopId } });
  let offerRow;
  if (existing) {
    await existing.update(offerPayload);
    offerRow = existing;
  } else {
    offerRow = await BulkBuyStoreOffer.create(offerPayload);
  }

  if (campaign.status === BulkBuyCampaignStatus.READY_FOR_OFFERS) {
    await campaign.update({ status: BulkBuyCampaignStatus.OFFERS_AVAILABLE });
  }

  const fullOffer = await BulkBuyStoreOffer.findByPk(offerRow.id, {
    include: [{ association: 'shop', attributes: ['id', 'name', 'address', 'phone'] }],
  });

  await notifyBulkBuyOfferPublished(campaign, fullOffer).catch(() => {});

  return serializeOffer(fullOffer);
}

export async function listCampaignOffers(campaignId) {
  const offers = await BulkBuyStoreOffer.findAll({
    where: { campaignId },
    include: [{ association: 'shop', attributes: ['id', 'name', 'address', 'phone'] }],
    order: [['createdAt', 'ASC']],
  });
  return offers.map(serializeOffer);
}

export async function getSubscriberUserIds(campaignId) {
  const rows = await BulkBuyParticipant.findAll({
    where: { campaignId, status: BulkBuyParticipantStatus.SUBSCRIBED },
    attributes: ['customerId'],
  });
  return rows.map((r) => r.customerId);
}

export async function getBulkPartnerShopsInArea(areaId) {
  return Shop.findAll({
    where: { areaId, bulkBuyEnabled: true },
    attributes: ['id', 'name'],
  });
}
