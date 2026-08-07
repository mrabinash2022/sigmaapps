import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { AnnouncementAudience } from '@localite/shared';

const PlatformAnnouncement = sequelize.define('PlatformAnnouncement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id',
  },
  audience: {
    type: DataTypes.ENUM(...Object.values(AnnouncementAudience)),
    allowNull: false,
    defaultValue: AnnouncementAudience.SHOPKEEPERS,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  startsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'starts_at',
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ends_at',
  },
}, {
  tableName: 'PlatformAnnouncements',
  timestamps: true,
});

export default PlatformAnnouncement;
