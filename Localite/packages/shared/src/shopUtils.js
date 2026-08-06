import { ShopOperationalStatus, ShopStatus } from './enums.js';

export function isShopOrderable(shop) {
  return (
    shop?.status === ShopStatus.APPROVED &&
    shop?.operationalStatus === ShopOperationalStatus.ENABLED &&
    shop?.isVerified === true
  );
}

export function isShopPubliclyListed(shop) {
  return isShopOrderable(shop);
}
