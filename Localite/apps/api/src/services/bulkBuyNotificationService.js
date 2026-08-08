import { BulkBuyParticipantStatus, UserRole } from '@localite/shared';
import { BulkBuyParticipant, Shop, ShopUser } from '../models/index.js';
import { sendPushToUser } from './notificationService.js';

async function getSubscriberUserIds(campaignId) {
  const rows = await BulkBuyParticipant.findAll({
    where: { campaignId, status: BulkBuyParticipantStatus.SUBSCRIBED },
    attributes: ['customerId'],
  });
  return rows.map((r) => r.customerId);
}

async function getBulkPartnerUserIdsForArea(areaId) {
  const shops = await Shop.findAll({
    where: { areaId, bulkBuyEnabled: true },
    attributes: ['id'],
  });
  if (!shops.length) return [];

  const shopIds = shops.map((s) => s.id);
  const links = await ShopUser.findAll({
    where: { shopId: shopIds },
    attributes: ['userId'],
  });
  return [...new Set(links.map((l) => l.userId))];
}

export async function notifyBulkBuySubscribersThreshold(campaign, subscriberCount) {
  const userIds = await getSubscriberUserIds(campaign.id);
  const title = 'Bulk buy threshold reached!';
  const body = `${subscriberCount} people are interested in "${campaign.title}". Stores are preparing offers.`;

  await Promise.all(userIds.map((userId) => sendPushToUser(userId, {
    title,
    body,
    data: { screen: 'BulkBuyCampaign', campaignId: campaign.id },
  })));
}

export async function notifyBulkBuyStoresThreshold(campaign, subscriberCount) {
  const userIds = await getBulkPartnerUserIdsForArea(campaign.areaId);
  if (!userIds.length) return;

  const title = 'New bulk buy opportunity';
  const body = `${subscriberCount} customers in ${campaign.area?.name || 'your area'} want "${campaign.title}". Submit your offer.`;

  await Promise.all(userIds.map((userId) => sendPushToUser(userId, {
    title,
    body,
    data: { screen: 'BulkBuyInbox', campaignId: campaign.id },
  })));
}

export async function notifyBulkBuyOfferPublished(campaign, offer) {
  const userIds = await getSubscriberUserIds(campaign.id);
  const shopName = offer.shop?.name || 'A store';
  const title = `New bulk offer from ${shopName}`;
  const body = `For "${campaign.title}" — ${offer.termsText || 'view discount and goodies in the app'}.`;

  await Promise.all(userIds.map((userId) => sendPushToUser(userId, {
    title,
    body,
    data: { screen: 'BulkBuyCampaign', campaignId: campaign.id, offerId: offer.id },
  })));
}
