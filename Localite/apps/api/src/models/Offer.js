import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { OfferScope, OfferAudience, DiscountType } from '@localite/shared';

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'shop_id',
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id',
  },
  scope: {
    type: DataTypes.ENUM(...Object.values(OfferScope)),
    allowNull: false,
    defaultValue: OfferScope.SHOP,
  },
  audience: {
    type: DataTypes.ENUM(...Object.values(OfferAudience)),
    allowNull: false,
    defaultValue: OfferAudience.CUSTOMERS,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  discountType: {
    type: DataTypes.ENUM(...Object.values(DiscountType)),
    allowNull: false,
    defaultValue: DiscountType.TEXT,
    field: 'discount_type',
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'discount_value',
  },
  bannerImageUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'banner_image_url',
  },
  startsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'starts_at',
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ends_at',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order',
  },
  showOnShopPage: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'show_on_shop_page',
  },
}, {
  tableName: 'Offers',
  timestamps: true,
});

export default Offer;
