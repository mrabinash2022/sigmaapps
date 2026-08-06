import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'token_hash',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'revoked_at',
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_agent',
  },
});

export default RefreshToken;
