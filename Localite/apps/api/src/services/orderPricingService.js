import { Op } from 'sequelize';
import { Offer } from '../models/index.js';
import { OfferAudience, OfferScope, applyDiscount, calculateDiscountAmount, pickBestOffer } from '@localite/shared';
import { filterActiveOffers, serializeOffer } from './offerService.js';

export async function getApplicableShopOffers(shopId) {
  const rows = await Offer.findAll({
    where: {
      shopId,
      scope: OfferScope.SHOP,
      isActive: true,
      audience: { [Op.in]: [OfferAudience.CUSTOMERS, OfferAudience.ALL] },
    },
    order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
  });
  return filterActiveOffers(rows.map(serializeOffer));
}

export async function resolveOrderPricing({ shopId, subtotalAmount, offerId }) {
  const subtotal = Number(subtotalAmount);
  if (!subtotal || subtotal <= 0) {
    const err = new Error('Valid subtotal amount is required');
    err.statusCode = 400;
    throw err;
  }

  const offers = await getApplicableShopOffers(shopId);
  let selected = offerId ? offers.find((o) => o.id === offerId) : null;
  if (!selected) selected = pickBestOffer(offers, subtotal);

  const discountAmount = selected ? calculateDiscountAmount(selected, subtotal) : 0;
  const pricing = applyDiscount(subtotal, discountAmount);

  return {
    ...pricing,
    appliedOfferId: selected?.id || null,
    appliedOffer: selected,
  };
}
