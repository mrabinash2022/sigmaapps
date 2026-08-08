import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const CustomerWishlistItem = sequelize.define('CustomerWishlistItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'shop_id',
  },
  catalogItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'catalog_item_id',
  },
}, {
  tableName: 'CustomerWishlistItems',
});

export default CustomerWishlistItem;
