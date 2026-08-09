import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import {
  DEFAULT_BULK_BUY_AUTO_CLOSE_GRACE_DAYS,
  DEFAULT_BULK_BUY_COLLECTION_DAYS,
  DEFAULT_BULK_BUY_MIN_SUBSCRIBERS,
} from '@localite/shared';

const BulkBuyPlatformSettings = sequelize.define('BulkBuyPlatformSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1,
  },
  collectionPeriodDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: DEFAULT_BULK_BUY_COLLECTION_DAYS,
    field: 'collection_period_days',
  },
  defaultMinSubscribers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: DEFAULT_BULK_BUY_MIN_SUBSCRIBERS,
    field: 'default_min_subscribers',
  },
  autoCloseGraceDaysAfterDealDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: DEFAULT_BULK_BUY_AUTO_CLOSE_GRACE_DAYS,
    field: 'auto_close_grace_days_after_deal_day',
  },
}, {
  tableName: 'BulkBuyPlatformSettings',
});

export default BulkBuyPlatformSettings;
