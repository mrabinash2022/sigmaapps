import {
  DEFAULT_BULK_BUY_AUTO_CLOSE_GRACE_DAYS,
  DEFAULT_BULK_BUY_COLLECTION_DAYS,
  DEFAULT_BULK_BUY_MIN_SUBSCRIBERS,
} from '@localite/shared';
import { BulkBuyPlatformSettings } from '../models/index.js';

export async function getBulkBuySettings() {
  const [row] = await BulkBuyPlatformSettings.findOrCreate({
    where: { id: 1 },
    defaults: {
      collectionPeriodDays: DEFAULT_BULK_BUY_COLLECTION_DAYS,
      defaultMinSubscribers: DEFAULT_BULK_BUY_MIN_SUBSCRIBERS,
      autoCloseGraceDaysAfterDealDay: DEFAULT_BULK_BUY_AUTO_CLOSE_GRACE_DAYS,
    },
  });
  return {
    collectionPeriodDays: row.collectionPeriodDays,
    defaultMinSubscribers: row.defaultMinSubscribers,
    autoCloseGraceDaysAfterDealDay: row.autoCloseGraceDaysAfterDealDay,
  };
}

export async function updateBulkBuySettings(updates) {
  const row = await BulkBuyPlatformSettings.findByPk(1);
  if (!row) {
    const err = new Error('Bulk buy settings not found');
    err.statusCode = 404;
    throw err;
  }

  const patch = {};
  if (updates.collectionPeriodDays !== undefined) {
    const days = Number(updates.collectionPeriodDays);
    if (!Number.isFinite(days) || days < 1) {
      const err = new Error('collectionPeriodDays must be at least 1');
      err.statusCode = 400;
      throw err;
    }
    patch.collectionPeriodDays = days;
  }
  if (updates.defaultMinSubscribers !== undefined) {
    const min = Number(updates.defaultMinSubscribers);
    if (!Number.isFinite(min) || min < 2) {
      const err = new Error('defaultMinSubscribers must be at least 2');
      err.statusCode = 400;
      throw err;
    }
    patch.defaultMinSubscribers = min;
  }
  if (updates.autoCloseGraceDaysAfterDealDay !== undefined) {
    const grace = Number(updates.autoCloseGraceDaysAfterDealDay);
    if (!Number.isFinite(grace) || grace < 0) {
      const err = new Error('autoCloseGraceDaysAfterDealDay must be 0 or more');
      err.statusCode = 400;
      throw err;
    }
    patch.autoCloseGraceDaysAfterDealDay = grace;
  }

  if (!Object.keys(patch).length) {
    const err = new Error('No valid fields to update');
    err.statusCode = 400;
    throw err;
  }

  await row.update(patch);
  return getBulkBuySettings();
}
