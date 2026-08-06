import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const UserDevice = sequelize.define('UserDevice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  expoPushToken: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'expo_push_token',
  },
  platform: {
    type: DataTypes.ENUM('ios', 'android', 'web'),
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
});

export default UserDevice;
