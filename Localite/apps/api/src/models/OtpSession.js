import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const OtpSession = sequelize.define('OtpSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  target: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  channel: {
    type: DataTypes.ENUM('sms', 'email'),
    allowNull: false,
    defaultValue: 'sms',
  },
  purpose: {
    type: DataTypes.ENUM('login', 'register'),
    allowNull: false,
    defaultValue: 'login',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otpHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'otp_hash',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_used',
  },
});

export default OtpSession;
