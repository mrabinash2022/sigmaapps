import { BulkBuyProductCategory } from './enums.js';

export const BULK_BUY_PRODUCT_LABELS = {
  [BulkBuyProductCategory.REFRIGERATOR]: 'Refrigerator',
  [BulkBuyProductCategory.WASHING_MACHINE]: 'Washing machine',
  [BulkBuyProductCategory.TELEVISION]: 'Television',
  [BulkBuyProductCategory.MOBILE]: 'Mobile phone',
  [BulkBuyProductCategory.AIR_CONDITIONER]: 'Air conditioner',
  [BulkBuyProductCategory.OTHER]: 'Other electronics',
};

export function getBulkBuyProductLabel(category) {
  return BULK_BUY_PRODUCT_LABELS[category] || category || 'Product';
}

export function formatBulkBuyProgress(subscriberCount, minSubscribers) {
  return `${subscriberCount}/${minSubscribers} interested`;
}

export function formatBulkBuyDiscount(offer) {
  if (!offer) return '';
  if (offer.discountType === 'percent' && offer.discountValue != null) {
    return `${offer.discountValue}% off`;
  }
  if (offer.discountType === 'flat' && offer.discountValue != null) {
    return `₹${offer.discountValue} off per unit`;
  }
  if (offer.discountType === 'text' && offer.discountValue) {
    return String(offer.discountValue);
  }
  return offer.termsText || 'Special bulk deal';
}

export function formatBulkBuyTokenAmount(amount) {
  if (amount == null || Number(amount) <= 0) return 'No token required';
  return `₹${Number(amount)} token`;
}

export function formatBulkBuyAcceptanceCount(acceptanceCount, subscriberCount) {
  return `${acceptanceCount || 0} of ${subscriberCount || 0} committed`;
}
