import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const CustomerFavoriteShop = sequelize.define('CustomerFavoriteShop', {
  userId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'user_id',
  },
  shopId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'shop_id',
  },
}, {
  tableName: 'CustomerFavoriteShops',
  timestamps: true,
  updatedAt: false,
});

export default CustomerFavoriteShop;
