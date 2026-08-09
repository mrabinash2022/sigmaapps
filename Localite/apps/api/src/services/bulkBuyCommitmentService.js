import { Op } from 'sequelize';
import {
  BulkBuyCampaignStatus,
  BulkBuyCommitmentStatus,
  BulkBuyParticipantStatus,
  BulkBuyTokenPaymentStatus,
  UserRole,
} from '@localite/shared';
import {
  BulkBuyCampaign,
  BulkBuyParticipant,
  BulkBuyStoreOffer,
  ShopUser,
} from '../models/index.js';
import { createRazorpayOrder, isRazorpayEnabled, verifyRazorpaySignature } from './razorpayService.js';
import { getCampaignById } from './bulkBuyService.js';
import {
  notifyBulkBuyDealDayConfirmed,
  notifyBulkBuyOfferAccepted,
  notifyBulkBuyTokenConfirmed,
  notifyBulkBuyTokenSubmitted,
} from './bulkBuyNotificationService.js';
import { getBulkBuySettings } from './bulkBuySettingsService.js';

const ACTIVE_COMMITMENTS = [
  BulkBuyCommitmentStatus.ACCEPTED,
  BulkBuyCommitmentStatus.TOKEN_PENDING,
  BulkBuyCommitmentStatus.TOKEN_PAYMENT_SUBMITTED,
  BulkBuyCommitmentStatus.TOKEN_PAID,
  BulkBuyCommitmentStatus.VISIT_SCHEDULED,
  BulkBuyCommitmentStatus.COMPLETED,
];

function normalizeDateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

export async function countOfferAcceptances(offerId) {
  return BulkBuyParticipant.count({
    where: {
      acceptedOfferId: offerId,
      commitmentStatus: { [Op.in]: ACTIVE_COMMITMENTS },
    },
  });
}

export async function getPollVoteSummary(campaignId) {
  const rows = await BulkBuyParticipant.findAll({
    where: {
      campaignId,
      status: BulkBuyParticipantStatus.SUBSCRIBED,
      pollVoteDate: { [Op.ne]: null },
    },
    attributes: ['pollVoteDate'],
  });
  const summary = {};
  for (const row of rows) {
    const key = normalizeDateKey(row.pollVoteDate);
    if (!key) continue;
    summary[key] = (summary[key] || 0) + 1;
  }
  return summary;
}

function serializeCommitment(participant) {
  const json = participant.toJSON ? participant.toJSON() : participant;
  const offer = json.acceptedOffer;
  return {
    id: json.id,
    customerId: json.customerId,
    customer: json.customer ? { id: json.customer.id, name: json.customer.name, phone: json.customer.phone } : undefined,
    acceptedOfferId: json.acceptedOfferId,
    acceptedOffer: offer ? {
      id: offer.id,
      shopId: offer.shopId,
      tokenAmount: offer.tokenAmount != null ? Number(offer.tokenAmount) : 0,
      proposedDealDay: offer.proposedDealDay,
      confirmedDealDay: offer.confirmedDealDay,
      shop: offer.shop ? {
        id: offer.shop.id,
        name: offer.shop.name,
        phone: offer.shop.phone,
        address: offer.shop.address,
      } : undefined,
    } : undefined,
    commitmentStatus: json.commitmentStatus,
    tokenAmount: json.tokenAmount != null ? Number(json.tokenAmount) : null,
    tokenPaymentStatus: json.tokenPaymentStatus,
    pollVoteDate: json.pollVoteDate,
    scheduledVisitAt: json.scheduledVisitAt,
    acceptedAt: json.acceptedAt,
    tokenPaidAt: json.tokenPaidAt,
    tokenConfirmedAt: json.tokenConfirmedAt,
    razorpayOrderId: json.razorpayOrderId,
    razorpayPaymentId: json.razorpayPaymentId,
    completedAt: json.completedAt,
  };
}

export async function getMyCommitment(campaignId, customerId) {
  const row = await BulkBuyParticipant.findOne({
    where: { campaignId, customerId },
    include: [
      { association: 'acceptedOffer', include: [{ association: 'shop', attributes: ['id', 'name', 'phone', 'address'] }] },
    ],
  });
  if (!row?.commitmentStatus) return null;
  return serializeCommitment(row);
}

async function assertCanManageCampaignClose(user, campaign) {
  if (user.role === UserRole.SUPER_ADMIN) return true;

  if (user.role === UserRole.CUSTOMER && campaign.createdByCustomerId === user.id) return true;

  if (user.role === UserRole.ADMIN) {
    if (campaign.createdByShopId) {
      const link = await ShopUser.findOne({ where: { userId: user.id, shopId: campaign.createdByShopId } });
      if (link) return true;
    }
    const links = await ShopUser.findAll({ where: { userId: user.id } });
    const shopIds = links.map((l) => l.shopId);
    if (shopIds.length) {
      const storeOffer = await BulkBuyStoreOffer.findOne({
        where: { campaignId: campaign.id, shopId: { [Op.in]: shopIds } },
      });
      if (storeOffer) return true;
    }
  }

  const err = new Error('You cannot close this campaign');
  err.statusCode = 403;
  throw err;
}

export async function setVisitPollDates(user, campaignId, visitPollDates) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }

  const canEdit = user.role === UserRole.SUPER_ADMIN
    || campaign.createdByCustomerId === user.id
    || (campaign.createdByShopId && await ShopUser.findOne({ where: { userId: user.id, shopId: campaign.createdByShopId } }));

  if (!canEdit) {
    const err = new Error('Only the campaign creator can set visit poll dates');
    err.statusCode = 403;
    throw err;
  }

  const dates = (visitPollDates || [])
    .map((d) => normalizeDateKey(d))
    .filter(Boolean);

  if (!dates.length || dates.length > 5) {
    const err = new Error('Provide 1 to 5 poll dates');
    err.statusCode = 400;
    throw err;
  }

  await campaign.update({ visitPollDates: dates });
  await maybeConfirmOfferDealDays(campaignId);
  return getCampaignById(campaignId, user);
}

export async function voteVisitPoll(user, campaignId, pollDate) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }

  const pollDates = campaign.visitPollDates || [];
  const voteKey = normalizeDateKey(pollDate);
  if (!voteKey || !pollDates.includes(voteKey)) {
    const err = new Error('Invalid poll date');
    err.statusCode = 400;
    throw err;
  }

  const participant = await BulkBuyParticipant.findOne({
    where: { campaignId, customerId: user.id, status: BulkBuyParticipantStatus.SUBSCRIBED },
  });
  if (!participant) {
    const err = new Error('Subscribe to the campaign before voting');
    err.statusCode = 400;
    throw err;
  }

  const tokenAmount = Number(participant.tokenAmount) || 0;
  if (participant.acceptedOfferId && tokenAmount > 0) {
    const canVote = [
      BulkBuyCommitmentStatus.TOKEN_PAID,
      BulkBuyCommitmentStatus.VISIT_SCHEDULED,
      BulkBuyCommitmentStatus.COMPLETED,
    ].includes(participant.commitmentStatus);
    if (!canVote) {
      const err = new Error('Pay the booking token and wait for store confirmation before voting');
      err.statusCode = 400;
      throw err;
    }
  }

  await participant.update({ pollVoteDate: voteKey });
  await maybeConfirmOfferDealDays(campaignId);
  return getCampaignById(campaignId, user);
}

export async function acceptStoreOffer(user, campaignId, offerId) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  if (![BulkBuyCampaignStatus.OFFERS_AVAILABLE, BulkBuyCampaignStatus.READY_FOR_OFFERS].includes(campaign.status)) {
    const err = new Error('This campaign is not accepting offer commitments');
    err.statusCode = 400;
    throw err;
  }

  const offer = await BulkBuyStoreOffer.findOne({
    where: { id: offerId, campaignId },
    include: [{ association: 'shop', attributes: ['id', 'name', 'phone', 'address'] }],
  });
  if (!offer) {
    const err = new Error('Offer not found');
    err.statusCode = 404;
    throw err;
  }

  const participant = await BulkBuyParticipant.findOne({
    where: { campaignId, customerId: user.id, status: BulkBuyParticipantStatus.SUBSCRIBED },
  });
  if (!participant) {
    const err = new Error('Subscribe to the campaign before accepting an offer');
    err.statusCode = 400;
    throw err;
  }

  if (participant.acceptedOfferId && participant.acceptedOfferId !== offerId) {
    const err = new Error('You can only commit to one store offer per campaign');
    err.statusCode = 400;
    throw err;
  }

  const tokenAmount = Number(offer.tokenAmount) || 0;
  const now = new Date();
  const updates = {
    acceptedOfferId: offer.id,
    acceptedAt: participant.acceptedAt || now,
    tokenAmount,
  };

  if (tokenAmount > 0) {
    updates.commitmentStatus = BulkBuyCommitmentStatus.TOKEN_PENDING;
    updates.tokenPaymentStatus = BulkBuyTokenPaymentStatus.PENDING;
  } else {
    updates.commitmentStatus = BulkBuyCommitmentStatus.TOKEN_PAID;
    updates.tokenPaymentStatus = BulkBuyTokenPaymentStatus.NOT_REQUIRED;
    updates.tokenPaidAt = now;
  }

  await participant.update(updates);
  await notifyBulkBuyOfferAccepted(campaign, offer, user).catch(() => {});
  await maybeConfirmOfferDealDays(campaignId);
  return getCampaignById(campaignId, user);
}

export async function withdrawOfferAcceptance(user, campaignId) {
  const participant = await BulkBuyParticipant.findOne({
    where: { campaignId, customerId: user.id },
  });
  if (!participant?.acceptedOfferId) {
    const err = new Error('No offer commitment to withdraw');
    err.statusCode = 400;
    throw err;
  }
  if (participant.tokenPaymentStatus === BulkBuyTokenPaymentStatus.PAID
    || participant.tokenPaymentStatus === BulkBuyTokenPaymentStatus.SUBMITTED) {
    const err = new Error('Cannot withdraw after token payment has been submitted');
    err.statusCode = 400;
    throw err;
  }

  await participant.update({
    acceptedOfferId: null,
    commitmentStatus: null,
    tokenAmount: null,
    tokenPaymentStatus: null,
    acceptedAt: null,
    razorpayOrderId: null,
    razorpayPaymentId: null,
    pollVoteDate: null,
    scheduledVisitAt: null,
  });

  return getCampaignById(campaignId, user);
}

export async function createTokenPaymentOrder(user, campaignId) {
  const participant = await BulkBuyParticipant.findOne({
    where: { campaignId, customerId: user.id },
  });
  if (!participant?.acceptedOfferId) {
    const err = new Error('Accept a store offer first');
    err.statusCode = 400;
    throw err;
  }
  const tokenAmount = Number(participant.tokenAmount) || 0;
  if (tokenAmount <= 0) {
    const err = new Error('No token payment required for this offer');
    err.statusCode = 400;
    throw err;
  }
  if (participant.tokenPaymentStatus === BulkBuyTokenPaymentStatus.PAID
    || participant.tokenPaymentStatus === BulkBuyTokenPaymentStatus.SUBMITTED) {
    const err = new Error('Token already paid or awaiting store confirmation');
    err.statusCode = 400;
    throw err;
  }

  if (!isRazorpayEnabled()) {
    const err = new Error('Razorpay not configured. Use mock token pay endpoint in dev.');
    err.statusCode = 503;
    throw err;
  }

  const rzpOrder = await createRazorpayOrder({
    amount: tokenAmount,
    orderId: participant.id,
    receipt: `bb-${participant.id.slice(0, 8)}`,
  });

  await participant.update({
    razorpayOrderId: rzpOrder.id,
    commitmentStatus: BulkBuyCommitmentStatus.TOKEN_PENDING,
    tokenPaymentStatus: BulkBuyTokenPaymentStatus.PENDING,
  });

  return {
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    tokenAmount,
  };
}

export async function verifyTokenPayment(user, campaignId, payload) {
  const participant = await BulkBuyParticipant.findOne({
    where: { campaignId, customerId: user.id },
    include: [{ association: 'acceptedOffer', include: [{ association: 'shop' }] }],
  });
  if (!participant?.acceptedOfferId) {
    const err = new Error('No offer commitment found');
    err.statusCode = 400;
    throw err;
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;
  if (isRazorpayEnabled()) {
    const valid = verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
    if (!valid) {
      const err = new Error('Payment verification failed');
      err.statusCode = 400;
      throw err;
    }
  }

  const now = new Date();
  await participant.update({
    tokenPaymentStatus: BulkBuyTokenPaymentStatus.SUBMITTED,
    commitmentStatus: BulkBuyCommitmentStatus.TOKEN_PAYMENT_SUBMITTED,
    tokenPaidAt: now,
    razorpayOrderId,
    razorpayPaymentId,
  });

  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  await notifyBulkBuyTokenSubmitted(campaign, participant.acceptedOffer, user).catch(() => {});
  return getCampaignById(campaignId, user);
}

export async function submitTokenPayment(user, campaignId, { paymentReference } = {}) {
  const participant = await BulkBuyParticipant.findOne({
    where: { campaignId, customerId: user.id },
    include: [{ association: 'acceptedOffer', include: [{ association: 'shop' }] }],
  });
  if (!participant?.acceptedOfferId) {
    const err = new Error('Accept a store offer first');
    err.statusCode = 400;
    throw err;
  }
  const tokenAmount = Number(participant.tokenAmount) || 0;
  if (tokenAmount <= 0) {
    const err = new Error('No token payment required for this offer');
    err.statusCode = 400;
    throw err;
  }
  if (participant.tokenPaymentStatus === BulkBuyTokenPaymentStatus.SUBMITTED
    || participant.tokenPaymentStatus === BulkBuyTokenPaymentStatus.PAID) {
    const err = new Error('Token payment already submitted');
    err.statusCode = 400;
    throw err;
  }

  if (isRazorpayEnabled()) {
    const err = new Error('Use create-token-order and verify-token-payment endpoints');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const reference = paymentReference?.trim() || `mock_${Date.now()}`;
  await participant.update({
    tokenPaymentStatus: BulkBuyTokenPaymentStatus.SUBMITTED,
    commitmentStatus: BulkBuyCommitmentStatus.TOKEN_PAYMENT_SUBMITTED,
    tokenPaidAt: now,
    razorpayPaymentId: reference,
  });

  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  await notifyBulkBuyTokenSubmitted(campaign, participant.acceptedOffer, user).catch(() => {});
  return getCampaignById(campaignId, user);
}

export async function mockTokenPayment(user, campaignId) {
  return submitTokenPayment(user, campaignId);
}

export async function confirmTokenPayment(actor, campaignId, participantId) {
  const participant = await BulkBuyParticipant.findByPk(participantId, {
    include: [
      { association: 'customer', attributes: ['id', 'name', 'phone'] },
      { association: 'acceptedOffer', include: [{ association: 'shop', attributes: ['id', 'name', 'phone'] }] },
    ],
  });
  if (!participant || participant.campaignId !== campaignId) {
    const err = new Error('Commitment not found');
    err.statusCode = 404;
    throw err;
  }
  if (participant.commitmentStatus !== BulkBuyCommitmentStatus.TOKEN_PAYMENT_SUBMITTED) {
    const err = new Error('No token payment awaiting confirmation');
    err.statusCode = 400;
    throw err;
  }

  if (actor.role === UserRole.ADMIN && participant.acceptedOfferId) {
    const offer = await BulkBuyStoreOffer.findByPk(participant.acceptedOfferId);
    const link = await ShopUser.findOne({ where: { userId: actor.id, shopId: offer.shopId } });
    if (!link) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
  } else if (actor.role !== UserRole.SUPER_ADMIN) {
    const err = new Error('Only the store can confirm token payment');
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  await participant.update({
    tokenPaymentStatus: BulkBuyTokenPaymentStatus.PAID,
    commitmentStatus: BulkBuyCommitmentStatus.TOKEN_PAID,
    tokenConfirmedAt: now,
    tokenConfirmedByUserId: actor.id,
  });

  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  await notifyBulkBuyTokenConfirmed(campaign, participant.acceptedOffer, participant.customer).catch(() => {});
  await maybeConfirmOfferDealDays(campaignId);
  return getCampaignById(campaignId, actor);
}

export async function markCommitmentCompleted(actor, campaignId, participantId) {
  const participant = await BulkBuyParticipant.findByPk(participantId, {
    include: [{ association: 'acceptedOffer' }],
  });
  if (!participant || participant.campaignId !== campaignId) {
    const err = new Error('Commitment not found');
    err.statusCode = 404;
    throw err;
  }

  if (actor.role === UserRole.CUSTOMER && participant.customerId !== actor.id) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }

  if (actor.role === UserRole.ADMIN && participant.acceptedOfferId) {
    const offer = await BulkBuyStoreOffer.findByPk(participant.acceptedOfferId);
    const link = await ShopUser.findOne({ where: { userId: actor.id, shopId: offer.shopId } });
    if (!link) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
  } else if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.CUSTOMER && actor.role !== UserRole.ADMIN) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }

  await participant.update({
    commitmentStatus: BulkBuyCommitmentStatus.COMPLETED,
    completedAt: new Date(),
  });

  await maybeAutoCloseCampaign(campaignId);
  return getCampaignById(campaignId, actor);
}

export async function listOfferCommitments(user, campaignId, offerId) {
  const offer = await BulkBuyStoreOffer.findOne({ where: { id: offerId, campaignId } });
  if (!offer) {
    const err = new Error('Offer not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.role === UserRole.ADMIN) {
    const link = await ShopUser.findOne({ where: { userId: user.id, shopId: offer.shopId } });
    if (!link) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
  } else if (user.role !== UserRole.SUPER_ADMIN) {
    const campaign = await BulkBuyCampaign.findByPk(campaignId);
    const canView = campaign?.createdByCustomerId === user.id;
    if (!canView) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
  }

  const rows = await BulkBuyParticipant.findAll({
    where: {
      campaignId,
      acceptedOfferId: offerId,
      commitmentStatus: { [Op.in]: ACTIVE_COMMITMENTS },
    },
    include: [{ association: 'customer', attributes: ['id', 'name', 'phone'] }],
    order: [['acceptedAt', 'ASC']],
  });

  return rows.map(serializeCommitment);
}

export async function closeCampaign(user, campaignId, { reason } = {}) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  if ([BulkBuyCampaignStatus.CLOSED, BulkBuyCampaignStatus.EXPIRED, BulkBuyCampaignStatus.CANCELLED].includes(campaign.status)) {
    const err = new Error('Campaign is already closed');
    err.statusCode = 400;
    throw err;
  }

  await assertCanManageCampaignClose(user, campaign);

  await campaign.update({
    status: BulkBuyCampaignStatus.CLOSED,
    closedAt: new Date(),
    closedByUserId: user.id,
    closeReason: reason || 'manual',
  });

  return getCampaignById(campaignId, user);
}

export async function maybeConfirmOfferDealDays(campaignId) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) return;

  const pollDates = (campaign.visitPollDates || []).map(normalizeDateKey).filter(Boolean);
  if (!pollDates.length) return;

  const voteSummary = await getPollVoteSummary(campaignId);
  const topEntry = Object.entries(voteSummary).sort((a, b) => b[1] - a[1])[0];
  if (!topEntry) return;

  const [winningDate] = topEntry;
  if (!pollDates.includes(winningDate)) return;

  const offers = await BulkBuyStoreOffer.findAll({ where: { campaignId } });
  for (const offer of offers) {
    if (offer.confirmedDealDay) continue;
    const proposed = normalizeDateKey(offer.proposedDealDay);
    if (!proposed || proposed !== winningDate) continue;

    await offer.update({ confirmedDealDay: proposed });
    await BulkBuyParticipant.update(
      {
        commitmentStatus: BulkBuyCommitmentStatus.VISIT_SCHEDULED,
        scheduledVisitAt: new Date(`${proposed}T10:00:00.000Z`),
      },
      {
        where: {
          campaignId,
          acceptedOfferId: offer.id,
          commitmentStatus: {
            [Op.in]: [BulkBuyCommitmentStatus.TOKEN_PAID, BulkBuyCommitmentStatus.ACCEPTED],
          },
        },
      },
    );

    await notifyBulkBuyDealDayConfirmed(campaign, offer, proposed).catch(() => {});
  }

  await maybeAutoCloseCampaign(campaignId);
}

export async function maybeAutoCloseCampaign(campaignId) {
  const campaign = await BulkBuyCampaign.findByPk(campaignId);
  if (!campaign) return;
  if ([BulkBuyCampaignStatus.CLOSED, BulkBuyCampaignStatus.EXPIRED, BulkBuyCampaignStatus.CANCELLED].includes(campaign.status)) {
    return;
  }

  const settings = await getBulkBuySettings();
  const graceMs = settings.autoCloseGraceDaysAfterDealDay * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const offers = await BulkBuyStoreOffer.findAll({ where: { campaignId } });
  const offersWithAcceptances = [];
  for (const offer of offers) {
    const count = await countOfferAcceptances(offer.id);
    if (count > 0) offersWithAcceptances.push(offer);
  }

  if (!offersWithAcceptances.length) return;

  const allDealDaysPassed = offersWithAcceptances.every((offer) => {
    if (!offer.confirmedDealDay) return false;
    const dealTime = new Date(`${normalizeDateKey(offer.confirmedDealDay)}T23:59:59.000Z`).getTime();
    return dealTime + graceMs < now;
  });

  if (allDealDaysPassed) {
    await campaign.update({
      status: BulkBuyCampaignStatus.CLOSED,
      closedAt: new Date(),
      closeReason: 'auto_deal_day_passed',
    });
  }
}

export async function expireStaleCollectingCampaigns() {
  const now = new Date();
  const stale = await BulkBuyCampaign.findAll({
    where: {
      status: BulkBuyCampaignStatus.COLLECTING,
      deadlineAt: { [Op.lte]: now },
    },
  });

  let expired = 0;
  for (const campaign of stale) {
    const subscriberCount = await BulkBuyParticipant.count({
      where: { campaignId: campaign.id, status: BulkBuyParticipantStatus.SUBSCRIBED },
    });
    if (subscriberCount < campaign.minSubscribers) {
      await campaign.update({
        status: BulkBuyCampaignStatus.EXPIRED,
        closedAt: now,
        closeReason: 'collection_deadline',
      });
      expired += 1;
    }
  }
  return { expired };
}

export async function processBulkBuyAutoClosures() {
  const campaigns = await BulkBuyCampaign.findAll({
    where: {
      status: {
        [Op.in]: [
          BulkBuyCampaignStatus.OFFERS_AVAILABLE,
          BulkBuyCampaignStatus.READY_FOR_OFFERS,
        ],
      },
    },
    attributes: ['id'],
  });

  for (const campaign of campaigns) {
    await maybeAutoCloseCampaign(campaign.id);
  }

  return expireStaleCollectingCampaigns();
}
