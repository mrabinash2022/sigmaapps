import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { UserRole } from '@localite/shared';

const SupportTicketMessage = sequelize.define('SupportTicketMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  senderRole: {
    type: DataTypes.ENUM(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    allowNull: false,
    field: 'sender_role',
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sender_id',
  },
});

export default SupportTicketMessage;
