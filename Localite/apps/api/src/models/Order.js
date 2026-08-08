import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { OrderType, OrderStatus, PaymentMethod, PaymentStatus } from '@localite/shared';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderType: {
    type: DataTypes.ENUM(...Object.values(OrderType)),
    allowNull: false,
    field: 'order_type',
  },
  textPayload: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'text_payload',
  },
  imagePayloadUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'image_payload_url',
  },
  orderStatus: {
    type: DataTypes.ENUM(...Object.values(OrderStatus)),
    allowNull: false,
    defaultValue: OrderStatus.CREATED,
    field: 'order_status',
  },
  finalBillAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'final_bill_amount',
  },
  deliveryTimeWindow: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'delivery_time_window',
  },
  paymentMethod: {
    type: DataTypes.ENUM(...Object.values(PaymentMethod)),
    allowNull: true,
    field: 'payment_method',
  },
  paymentStatus: {
    type: DataTypes.ENUM(...Object.values(PaymentStatus)),
    allowNull: true,
    defaultValue: PaymentStatus.PENDING,
    field: 'payment_status',
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
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
  },
  catalogPayload: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'catalog_payload',
  },
  returnReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'return_reason',
  },
  razorpayRefundId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'razorpay_refund_id',
  },
  returnedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'returned_at',
  },
  parentOrderId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_order_id',
  },
  fulfillmentPayload: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'fulfillment_payload',
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason',
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at',
  },
});

export default Order;
