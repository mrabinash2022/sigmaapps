import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { BulkBuyParticipantStatus } from '@localite/shared';

const BulkBuyParticipant = sequelize.define('BulkBuyParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'campaign_id',
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'customer_id',
  },
  status: {
    type: DataTypes.ENUM(...Object.values(BulkBuyParticipantStatus)),
    allowNull: false,
    defaultValue: BulkBuyParticipantStatus.SUBSCRIBED,
  },
}, {
  tableName: 'BulkBuyParticipants',
});

export default BulkBuyParticipant;
