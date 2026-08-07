const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseWeeklyOffDays(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6);
  return [];
}

export function formatWeeklyOffDays(days) {
  const parsed = parseWeeklyOffDays(days);
  if (!parsed.length) return 'No weekly off';
  return parsed.map((d) => DAY_NAMES[d]).join(', ');
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isWeeklyOffToday(weeklyOffDays, date = new Date()) {
  return parseWeeklyOffDays(weeklyOffDays).includes(date.getDay());
}

export function isShopTemporarilyClosed(storeInfo, now = new Date()) {
  if (!storeInfo) return false;
  if (storeInfo.isManuallyClosed) return true;
  if (storeInfo.closedUntil && new Date(storeInfo.closedUntil) > now) return true;
  return false;
}

export function isWithinBusinessHours(storeInfo, now = new Date()) {
  const openMinutes = parseTimeToMinutes(storeInfo?.openTime);
  const closeMinutes = parseTimeToMinutes(storeInfo?.closeTime);
  if (openMinutes == null || closeMinutes == null) return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (closeMinutes >= openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

export function getStoreStatusSummary(storeInfo, now = new Date()) {
  if (!storeInfo) {
    return { isOpen: true, label: null, reason: null };
  }

  if (isShopTemporarilyClosed(storeInfo, now)) {
    return {
      isOpen: false,
      label: storeInfo.closedMessage || 'Closed',
      reason: 'temporary',
    };
  }

  if (isWeeklyOffToday(storeInfo.weeklyOffDays, now)) {
    return {
      isOpen: false,
      label: 'Weekly off today',
      reason: 'weekly_off',
    };
  }

  if (!isWithinBusinessHours(storeInfo, now)) {
    const hours = storeInfo.openTime && storeInfo.closeTime
      ? `${storeInfo.openTime} – ${storeInfo.closeTime}`
      : null;
    return {
      isOpen: false,
      label: hours ? `Opens ${storeInfo.openTime}` : 'Closed now',
      reason: 'hours',
    };
  }

  return { isOpen: true, label: 'Open now', reason: null };
}

export function formatOfferDiscount(offer) {
  if (!offer) return '';
  if (offer.discountType === 'percent' && offer.discountValue != null) {
    return `${offer.discountValue}% off`;
  }
  if (offer.discountType === 'flat' && offer.discountValue != null) {
    return `₹${Number(offer.discountValue).toFixed(0)} off`;
  }
  return offer.description || offer.title || '';
}

export function isOfferActive(offer, now = new Date()) {
  if (!offer?.isActive) return false;
  if (offer.startsAt && new Date(offer.startsAt) > now) return false;
  if (offer.endsAt && new Date(offer.endsAt) < now) return false;
  return true;
}
