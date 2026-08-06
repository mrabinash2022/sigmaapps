import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const OrderEvent = sequelize.define('OrderEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fromStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'from_status',
  },
  toStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'to_status',
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default OrderEvent;
