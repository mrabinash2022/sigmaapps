import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import {
  BulkBuyCommitmentStatus,
  BulkBuyParticipantStatus,
  BulkBuyTokenPaymentStatus,
} from '@localite/shared';

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
  acceptedOfferId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'accepted_offer_id',
  },
  commitmentStatus: {
    type: DataTypes.ENUM(...Object.values(BulkBuyCommitmentStatus)),
    allowNull: true,
    field: 'commitment_status',
  },
  tokenAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'token_amount',
  },
  tokenPaymentStatus: {
    type: DataTypes.ENUM(...Object.values(BulkBuyTokenPaymentStatus)),
    allowNull: true,
    field: 'token_payment_status',
  },
  razorpayOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'razorpay_order_id',
  },
  razorpayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'razorpay_payment_id',
  },
  pollVoteDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'poll_vote_date',
  },
  scheduledVisitAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_visit_at',
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'accepted_at',
  },
  tokenPaidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'token_paid_at',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
}, {
  tableName: 'BulkBuyParticipants',
});

export default BulkBuyParticipant;
