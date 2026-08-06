import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const ShopUser = sequelize.define('ShopUser', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role: {
    type: DataTypes.ENUM('owner', 'staff'),
    allowNull: false,
    defaultValue: 'owner',
  },
});

export default ShopUser;
