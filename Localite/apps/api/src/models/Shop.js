import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { ShopCategory, ShopOperationalStatus, ShopStatus } from '@localite/shared';

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  shopCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'shop_code',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(...Object.values(ShopCategory)),
    allowNull: false,
  },
  ownerName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'owner_name',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  itemTypes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'item_types',
    comment: 'Description of items the store sells',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'logo_url',
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 99,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(ShopStatus)),
    allowNull: false,
    defaultValue: ShopStatus.PENDING,
  },
  operationalStatus: {
    type: DataTypes.ENUM(...Object.values(ShopOperationalStatus)),
    allowNull: false,
    defaultValue: ShopOperationalStatus.DISABLED,
    field: 'operational_status',
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified',
  },
  invitedOwnerPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'invited_owner_phone',
  },
  appliedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'applied_by_id',
  },
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by_id',
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
  },
  visualCatalogEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'visual_catalog_enabled',
  },
});

export default Shop;
