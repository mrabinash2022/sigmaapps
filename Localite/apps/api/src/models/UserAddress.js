import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const UserAddress = sequelize.define('UserAddress', {
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
  label: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Home',
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  areaId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'area_id',
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_default',
  },
}, {
  tableName: 'UserAddresses',
  underscored: false,
});

export default UserAddress;
