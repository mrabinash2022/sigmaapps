import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { TicketIssueType, TicketStatus, UserRole } from '@localite/shared';

const SupportTicket = sequelize.define('SupportTicket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  issueType: {
    type: DataTypes.ENUM(...Object.values(TicketIssueType)),
    allowNull: false,
    field: 'issue_type',
  },
  customerMessage: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'customer_message',
  },
  shopkeeperResolution: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'shopkeeper_resolution',
  },
  ticketStatus: {
    type: DataTypes.ENUM(...Object.values(TicketStatus)),
    allowNull: false,
    defaultValue: TicketStatus.OPEN,
    field: 'ticket_status',
  },
  raisedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'raised_by_id',
  },
  raisedByRole: {
    type: DataTypes.ENUM(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    allowNull: true,
    field: 'raised_by_role',
  },
});

export default SupportTicket;
