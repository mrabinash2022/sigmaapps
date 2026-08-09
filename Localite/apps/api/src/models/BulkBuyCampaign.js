import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import {
  BulkBuyCampaignCreatorType,
  BulkBuyCampaignStatus,
  BulkBuyProductCategory,
  DEFAULT_BULK_BUY_MIN_SUBSCRIBERS,
} from '@localite/shared';

const BulkBuyCampaign = sequelize.define('BulkBuyCampaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  areaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'area_id',
  },
  createdByType: {
    type: DataTypes.ENUM(...Object.values(BulkBuyCampaignCreatorType)),
    allowNull: false,
    field: 'created_by_type',
  },
  createdByCustomerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_customer_id',
  },
  createdByShopId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_shop_id',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productCategory: {
    type: DataTypes.ENUM(...Object.values(BulkBuyProductCategory)),
    allowNull: false,
    field: 'product_category',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  brandPreference: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'brand_preference',
  },
  minSubscribers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: DEFAULT_BULK_BUY_MIN_SUBSCRIBERS,
    field: 'min_subscribers',
  },
  status: {
    type: DataTypes.ENUM(...Object.values(BulkBuyCampaignStatus)),
    allowNull: false,
    defaultValue: BulkBuyCampaignStatus.COLLECTING,
  },
  deadlineAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deadline_at',
  },
  thresholdReachedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'threshold_reached_at',
  },
  visitPollDates: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'visit_poll_dates',
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_at',
  },
  closedByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'closed_by_user_id',
  },
  closeReason: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'close_reason',
  },
}, {
  tableName: 'BulkBuyCampaigns',
});

export default BulkBuyCampaign;
