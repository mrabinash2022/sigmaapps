import { Op, fn, col, literal } from 'sequelize';
import {
  Shop,
  ShopStoreInfo,
  Offer,
  PlatformAnnouncement,
  CustomerFavoriteShop,
  Order,
  ShopUser,
} from '../models/index.js';
import {
  AnnouncementAudience,
  OfferAudience,
  OfferScope,
  OrderStatus,
  ShopOperationalStatus,
  ShopStatus,
  isOfferActive,
} from '@localite/shared';
import { findShopsForAdmin } from './shopService.js';
import { getActivePlatformOffers, getActiveShopOffers, getTopOffersAcrossShops, serializeOffer } from './offerService.js';
import { getStoreInfoMap, serializeStoreInfo } from './storeInfoService.js';
import { getShopInsights } from './analyticsService.js';
import { getShopRatingSummary } from './ratingService.js';
import { ShopCatalogItem } from '../models/index.js';

function isAnnouncementActive(row, now = new Date()) {
  if (!row?.isActive) return false;
  if (row.startsAt && new Date(row.startsAt) > now) return false;
  if (row.endsAt && new Date(row.endsAt) < now) return false;
  return true;
}

export async function getActiveAnnouncements(audience) {
  const rows = await PlatformAnnouncement.findAll({
    where: {
      isActive: true,
      audience: { [Op.in]: [audience, AnnouncementAudience.ALL] },
    },
    order: [['createdAt', 'DESC']],
    limit: 20,
  });
  return rows.filter((row) => isAnnouncementActive(row)).map((row) => row.toJSON());
}

export async function getCustomerHome(user) {
  const areaId = user.areaId;
  const [platformOffers, topOffers, favorites, announcements] = await Promise.all([
    getActivePlatformOffers(Offer, { audience: OfferAudience.CUSTOMERS, limit: 5 }),
    getTopOffersAcrossShops(Offer, Shop, { limit: 5, areaId, audience: OfferAudience.CUSTOMERS }),
    CustomerFavoriteShop.findAll({
      where: { userId: user.id },
      include: [{
        model: Shop,
        as: 'shop',
        attributes: ['id', 'name', 'category', 'address', 'logoUrl'],
        where: {
          status: ShopStatus.APPROVED,
          operationalStatus: ShopOperationalStatus.ENABLED,
          isVerified: true,
        },
        required: true,
      }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    }),
    getActiveAnnouncements(AnnouncementAudience.CUSTOMERS),
  ]);

  const favoriteShopIds = favorites.map((f) => f.shopId);
  const [storeInfoMap, offersMap] = await Promise.all([
    getStoreInfoMap(ShopStoreInfo, favoriteShopIds),
    getActiveShopOffers(Offer, favoriteShopIds, { limitPerShop: 1 }),
  ]);

  const favoriteStores = favorites.map((fav) => {
    const shop = fav.shop.toJSON();
    return {
      ...shop,
      storeInfo: storeInfoMap[shop.id] || null,
      topOffer: offersMap[shop.id]?.[0] || null,
    };
  });

  const closedStores = favoriteStores
    .filter((s) => s.storeInfo && !s.storeInfo.status?.isOpen)
    .map((s) => ({
      shopId: s.id,
      shopName: s.name,
      status: s.storeInfo.status,
    }));

  return {
    platformOffers,
    topOffers,
    announcements,
    favoriteStores,
    closedStores,
    supportInfo: {
      message: 'Need help? Open any order and raise a support ticket, or contact your society admin.',
    },
  };
}

export async function getShopkeeperHome(user) {
  const shops = await findShopsForAdmin(Shop, ShopUser, user);
  const primaryShop = shops[0] || null;
  const shopId = primaryShop?.id;

  const [announcements, offers, storeInfo, insights, lowStockItems] = await Promise.all([
    getActiveAnnouncements(AnnouncementAudience.SHOPKEEPERS),
    shopId
      ? Offer.findAll({
        where: { shopId, scope: OfferScope.SHOP },
        order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
        limit: 20,
      })
      : [],
    shopId ? ShopStoreInfo.findByPk(shopId) : null,
    shopId ? getShopInsights(shopId, { days: 30 }) : null,
    shopId
      ? ShopCatalogItem.findAll({
        where: {
          shopId,
          trackStock: true,
          stockQuantity: { [Op.lte]: primaryShop?.lowStockThreshold || 5 },
        },
        order: [['stockQuantity', 'ASC']],
        limit: 5,
      })
      : [],
  ]);

  const activeOffers = offers
    .map(serializeOffer)
    .filter((o) => isOfferActive(o))
    .slice(0, 3);

  return {
    shop: primaryShop ? primaryShop.toJSON() : null,
    announcements,
    topOffers: activeOffers,
    storeInfo: serializeStoreInfo(storeInfo),
    insights,
    lowStockItems: lowStockItems.map((item) => item.toJSON()),
  };
}

export async function getSuperAdminHome({ metric = 'revenue', limit = 10 } = {}) {
  const deliveredStatuses = [OrderStatus.DELIVERED, OrderStatus.RETURNED];

  const topByRevenue = await Order.findAll({
    attributes: [
      'shopId',
      [fn('COUNT', col('Order.id')), 'orderCount'],
      [fn('COALESCE', fn('SUM', col('final_bill_amount')), 0), 'totalRevenue'],
    ],
    where: {
      orderStatus: { [Op.in]: deliveredStatuses },
      parentOrderId: null,
    },
    include: [{
      model: Shop,
      as: 'shop',
      attributes: ['id', 'name', 'category', 'shopCode'],
      required: true,
    }],
    group: ['shopId', 'shop.id'],
    order: [[literal('COALESCE(SUM("Order"."final_bill_amount"), 0)'), 'DESC']],
    limit,
    subQuery: false,
  });

  const topByVolume = await Order.findAll({
    attributes: [
      'shopId',
      [fn('COUNT', col('Order.id')), 'orderCount'],
      [fn('COALESCE', fn('SUM', col('final_bill_amount')), 0), 'totalRevenue'],
    ],
    where: {
      orderStatus: { [Op.in]: deliveredStatuses },
      parentOrderId: null,
    },
    include: [{
      model: Shop,
      as: 'shop',
      attributes: ['id', 'name', 'category', 'shopCode'],
      required: true,
    }],
    group: ['shopId', 'shop.id'],
    order: [[fn('COUNT', col('Order.id')), 'DESC']],
    limit,
    subQuery: false,
  });

  const mapRow = (row) => ({
    shopId: row.shopId,
    shop: row.shop?.toJSON?.() || row.shop,
    orderCount: Number(row.get('orderCount') || 0),
    totalRevenue: Number(row.get('totalRevenue') || 0),
  });

  return {
    metric,
    topShopsByRevenue: topByRevenue.map(mapRow),
    topShopsByVolume: topByVolume.map(mapRow),
    platformOffers: await getActivePlatformOffers(Offer, { audience: OfferAudience.ALL, limit: 5 }),
  };
}

export async function attachShopPublicInfo(shops) {
  const shopIds = shops.map((s) => s.id || s.shopId);
  const [storeInfoMap, offersMap, ratingsMap] = await Promise.all([
    getStoreInfoMap(ShopStoreInfo, shopIds),
    getActiveShopOffers(Offer, shopIds, { limitPerShop: 3 }),
    getShopRatingSummary(shopIds),
  ]);

  return shops.map((shop) => {
    const id = shop.id || shop.shopId;
    return {
      ...shop,
      storeInfo: storeInfoMap[id] || null,
      activeOffers: offersMap[id] || [],
      rating: ratingsMap[id] || null,
    };
  });
}

export async function listFavoriteShopIds(userId) {
  const rows = await CustomerFavoriteShop.findAll({
    where: { userId },
    attributes: ['shopId'],
  });
  return rows.map((r) => r.shopId);
}

export async function addFavoriteShop(userId, shopId) {
  const shop = await Shop.findByPk(shopId);
  if (!shop || shop.status !== ShopStatus.APPROVED) {
    const err = new Error('Shop not found');
    err.statusCode = 404;
    throw err;
  }
  await CustomerFavoriteShop.findOrCreate({ where: { userId, shopId } });
  return { shopId };
}

export async function removeFavoriteShop(userId, shopId) {
  await CustomerFavoriteShop.destroy({ where: { userId, shopId } });
  return { shopId };
}
