import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const ShopCatalogItem = sequelize.define('ShopCatalogItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'shop_id',
  },
  itemGroup: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'item_group',
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'image_url',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  sizeLabel: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'size_label',
  },
  unit: {
    type: DataTypes.STRING(32),
    allowNull: true,
    defaultValue: 'piece',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order',
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_available',
  },
  publishStatus: {
    type: DataTypes.ENUM('draft', 'published'),
    allowNull: false,
    defaultValue: 'draft',
    field: 'publish_status',
  },
});

export default ShopCatalogItem;
