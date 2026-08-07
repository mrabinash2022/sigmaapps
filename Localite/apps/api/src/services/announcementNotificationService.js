import { AnnouncementAudience, UserAccountStatus, UserRole } from '@localite/shared';
import { User } from '../models/index.js';
import { sendPushToUser } from './notificationService.js';

function rolesForAudience(audience) {
  if (audience === AnnouncementAudience.SHOPKEEPERS) return [UserRole.ADMIN];
  if (audience === AnnouncementAudience.CUSTOMERS) return [UserRole.CUSTOMER];
  return [UserRole.ADMIN, UserRole.CUSTOMER];
}

function truncateBody(text, max = 120) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export async function notifyAnnouncementAudience(announcement) {
  if (!announcement?.isActive) return { sent: 0, users: 0 };

  const roles = rolesForAudience(announcement.audience);
  const users = await User.findAll({
    where: {
      role: roles,
      isActive: true,
      accountStatus: UserAccountStatus.ENABLED,
    },
    attributes: ['id'],
  });

  let sent = 0;
  await Promise.all(users.map(async (user) => {
    const result = await sendPushToUser(user.id, {
      title: announcement.title,
      body: truncateBody(announcement.body),
      data: {
        type: 'platform_announcement',
        announcementId: announcement.id,
      },
    });
    sent += result.sent || 0;
  }));

  return { sent, users: users.length };
}
