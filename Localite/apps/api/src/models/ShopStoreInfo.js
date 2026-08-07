import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const ShopStoreInfo = sequelize.define('ShopStoreInfo', {
  shopId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'shop_id',
  },
  openTime: {
    type: DataTypes.STRING(5),
    allowNull: true,
    field: 'open_time',
  },
  closeTime: {
    type: DataTypes.STRING(5),
    allowNull: true,
    field: 'close_time',
  },
  weeklyOffDays: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'weekly_off_days',
  },
  isManuallyClosed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_manually_closed',
  },
  closedMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'closed_message',
  },
  closedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_until',
  },
}, {
  tableName: 'ShopStoreInfos',
  timestamps: true,
});

export default ShopStoreInfo;
