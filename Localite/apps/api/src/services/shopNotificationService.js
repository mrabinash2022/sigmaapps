import { UserRole } from '@localite/shared';
import { User } from '../models/index.js';
import { sendPushToUser } from './notificationService.js';
import { notifyContactAllChannels } from './messagingService.js';
import { normalizePhone } from './userService.js';

async function getSuperAdmins() {
  return User.findAll({
    where: { role: UserRole.SUPER_ADMIN, isActive: true },
    attributes: ['id', 'name', 'phone', 'email'],
  });
}

export async function notifySuperAdminsNewShopRequest(shop, applicant) {
  const applicantName = applicant?.name || shop.ownerName || 'A shopkeeper';
  const title = 'New shop approval request';
  const message = `${applicantName} submitted "${shop.name}" for approval. Open Super Admin → Pending to review.`;
  const pushBody = `${applicantName} submitted "${shop.name}" for your approval.`;

  const superAdmins = await getSuperAdmins();
  await Promise.all(superAdmins.map(async (admin) => {
    await sendPushToUser(admin.id, { title, body: pushBody, data: { type: 'shop_pending', shopId: shop.id } });
    await notifyContactAllChannels(admin, { title, message });
  }));
}

export async function notifyShopApproval(shop, applicant) {
  const shopCode = shop.shopCode || 'your store';
  const title = 'Shop approved on Localite';
  const message = `Your Localite account and shop "${shop.name}" (${shopCode}) have been approved. Your store is now live and you can start receiving orders.`;

  const tasks = [];

  if (applicant) {
    tasks.push(
      sendPushToUser(applicant.id, {
        title: 'Shop approved!',
        body: message,
        data: { type: 'shop_approved', shopId: shop.id },
      }),
      notifyContactAllChannels(applicant, { title, message }),
    );
  }

  const shopPhone = normalizePhone(shop.phone);
  const userPhone = normalizePhone(applicant?.phone);
  if (shopPhone && shopPhone !== userPhone) {
    tasks.push(
      notifyContactAllChannels(
        { phone: shopPhone, email: applicant?.email, name: shop.ownerName || applicant?.name },
        { title, message },
      ),
    );
  }

  await Promise.all(tasks);
}

export async function notifyShopRejection(shop, applicant, rejectionReason) {
  const title = 'Shop application update';
  const message = `Your application for "${shop.name}" was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;

  const tasks = [];
  if (applicant) {
    tasks.push(
      sendPushToUser(applicant.id, { title, body: message, data: { type: 'shop_rejected', shopId: shop.id } }),
      notifyContactAllChannels(applicant, { title, message }),
    );
  }
  await Promise.all(tasks);
}
