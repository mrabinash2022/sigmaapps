import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const BulkBuyStoreOffer = sequelize.define('BulkBuyStoreOffer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'campaign_id',
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'shop_id',
  },
  discountType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'percent',
    field: 'discount_type',
  },
  discountValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'discount_value',
  },
  extras: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  termsText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'terms_text',
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'valid_until',
  },
  submittedByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'submitted_by_user_id',
  },
  tokenAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'token_amount',
  },
  proposedDealDay: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'proposed_deal_day',
  },
  confirmedDealDay: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'confirmed_deal_day',
  },
}, {
  tableName: 'BulkBuyStoreOffers',
});

export default BulkBuyStoreOffer;
