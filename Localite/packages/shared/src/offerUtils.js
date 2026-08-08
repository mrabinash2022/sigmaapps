import { DiscountType } from './enums.js';
import { isOfferActive } from './homeUtils.js';

export function calculateDiscountAmount(offer, subtotal) {
  const amount = Number(subtotal);
  if (!offer || !isOfferActive(offer) || Number.isNaN(amount) || amount <= 0) return 0;

  if (offer.discountType === DiscountType.PERCENT && offer.discountValue != null) {
    return Math.min(amount, (amount * Number(offer.discountValue)) / 100);
  }
  if (offer.discountType === DiscountType.FLAT && offer.discountValue != null) {
    return Math.min(amount, Number(offer.discountValue));
  }
  return 0;
}

export function applyDiscount(subtotal, discountAmount) {
  const base = Number(subtotal) || 0;
  const discount = Math.max(0, Math.min(base, Number(discountAmount) || 0));
  return {
    subtotalAmount: base,
    discountAmount: discount,
    finalBillAmount: Math.max(0, base - discount),
  };
}

export function pickBestOffer(offers, subtotal) {
  if (!offers?.length) return null;
  let best = null;
  let bestDiscount = 0;
  for (const offer of offers) {
    const discount = calculateDiscountAmount(offer, subtotal);
    if (discount > bestDiscount) {
      bestDiscount = discount;
      best = offer;
    }
  }
  return best;
}
