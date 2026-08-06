import { loadEnv } from '../src/config/loadEnv.js';
import sequelize from '../src/database.js';
import { User } from '../src/models/index.js';
import { UserAccountStatus, UserRole } from '@localite/shared';
import { hashPassword } from '../src/services/cryptoService.js';

loadEnv();

const DEMO_ACCOUNTS = [
  {
    phone: process.env.SUPER_ADMIN_PHONE || '9000000001',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
    email: 'superadmin@localite.dev',
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    username: 'superadmin',
    role: UserRole.SUPER_ADMIN,
  },
  {
    phone: '9999999999',
    password: 'Admin@12345',
    email: 'shopkeeper@localite.dev',
    name: 'Demo Shopkeeper',
    username: 'shopadmin',
    role: UserRole.ADMIN,
  },
  {
    phone: '8888888888',
    password: 'Customer@123',
    email: 'customer@localite.dev',
    name: 'Demo Customer',
    username: 'customer1',
    role: UserRole.CUSTOMER,
  },
];

async function upsertDemoUser({ phone, password, email, name, username, role }) {
  const passwordHash = await hashPassword(password);
  const now = new Date();

  let user = await User.findOne({ where: { phone } });
  if (!user) {
    user = await User.create({
      phone,
      name,
      username,
      email,
      passwordHash,
      role,
      isOnboarded: true,
      phoneVerifiedAt: now,
      emailVerifiedAt: now,
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
    });
    console.log(`Created ${role}: ${phone} / ${email}`);
    return user;
  }

  await user.update({
    name,
    username,
    email,
    passwordHash,
    role,
    isOnboarded: true,
    phoneVerifiedAt: user.phoneVerifiedAt || now,
    emailVerifiedAt: now,
    accountStatus: UserAccountStatus.ENABLED,
    isActive: true,
  });
  console.log(`Updated ${role}: ${phone} / ${email}`);
  return user;
}

await sequelize.authenticate();

for (const account of DEMO_ACCOUNTS) {
  await upsertDemoUser(account);
}

console.log('Demo accounts are ready. Login: password step, then email OTP 123456 (dev).');
await sequelize.close();
process.exit(0);
