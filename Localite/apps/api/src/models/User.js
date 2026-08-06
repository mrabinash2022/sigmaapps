import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { UserRole, UserAccountStatus } from '@localite/shared';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_hash',
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  areaId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'area_id',
  },
  role: {
    type: DataTypes.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.CUSTOMER,
  },
  isOnboarded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_onboarded',
  },
  phoneVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'phone_verified_at',
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_verified_at',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  accountStatus: {
    type: DataTypes.ENUM(...Object.values(UserAccountStatus)),
    allowNull: false,
    defaultValue: UserAccountStatus.ENABLED,
    field: 'account_status',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at',
  },
  profilePictureUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'profile_picture_url',
  },
});

export default User;
