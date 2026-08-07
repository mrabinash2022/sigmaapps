import { loadEnv } from '../src/config/loadEnv.js';
import sequelize from '../src/database.js';
import '../src/models/index.js';
import { Area, Shop, ShopUser, User } from '../src/models/index.js';
import { ShopOperationalStatus, ShopStatus, UserAccountStatus, UserRole } from '@localite/shared';
import { hashPassword } from '../src/services/cryptoService.js';
import { linkShopOwner, syncShopOwnerUsers } from '../src/services/shopService.js';
import { migrateHomeSchema } from '../src/services/homeSchemaMigration.js';
import { seedHomeDemoData } from '../src/seeders/homeSeed.js';

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
    areaName: 'Pimple Saudagar',
    address: 'Pimple Saudagar, Pune',
  },
  {
    phone: '8888888888',
    password: 'Customer@123',
    email: 'customer@localite.dev',
    name: 'Demo Customer',
    username: 'customer1',
    role: UserRole.CUSTOMER,
    areaName: 'Pimple Saudagar',
    address: 'Roseland Residency, Pimple Saudagar',
  },
];

async function upsertDemoUser(account) {
  const { phone, password, email, name, username, role, areaName, address } = account;
  const passwordHash = await hashPassword(password);
  const now = new Date();

  let areaId = null;
  if (areaName) {
    const [area] = await Area.findOrCreate({
      where: { name: areaName },
      defaults: { city: 'Pune (PCMC)', isActive: true },
    });
    areaId = area.id;
  }

  let user = await User.findOne({ where: { phone } });
  if (!user) {
    user = await User.create({
      phone,
      name,
      username,
      email,
      passwordHash,
      role,
      address: address || null,
      areaId,
      isOnboarded: true,
      phoneVerifiedAt: now,
      emailVerifiedAt: now,
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
    });
    console.log(`Created ${role}: ${phone}`);
  } else {
    await user.update({
      name,
      username,
      email,
      passwordHash,
      role,
      address: address || user.address,
      areaId: areaId || user.areaId,
      isOnboarded: true,
      phoneVerifiedAt: user.phoneVerifiedAt || now,
      emailVerifiedAt: now,
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
    });
    console.log(`Updated ${role}: ${phone}`);
  }

  return user;
}

async function syncDemoShopkeeper(shopAdmin, superAdmin) {
  const area = await Area.findOne({ where: { name: 'Pimple Saudagar' } });
  if (!area) {
    console.warn('No Pimple Saudagar area found — run seed first');
    return null;
  }

  const demoShop = await Shop.findOne({
    where: { name: 'Daily Needs Grocery', areaId: area.id },
  }) || await Shop.findOne({
    where: { areaId: area.id, status: ShopStatus.APPROVED },
    order: [['rank', 'ASC'], ['name', 'ASC']],
  });

  if (!demoShop) {
    console.warn('No shop found to link demo shopkeeper');
    return area;
  }

  await demoShop.update({ phone: shopAdmin.phone, ownerName: shopAdmin.name });
  await linkShopOwner(Shop, ShopUser, demoShop, shopAdmin);
  if (!demoShop.approvedById && superAdmin) {
    await demoShop.update({ approvedById: superAdmin.id });
  }

  console.log(`Linked demo shopkeeper ${shopAdmin.phone} → ${demoShop.name} (${demoShop.shopCode})`);
  return area;
}

await sequelize.authenticate();
await migrateHomeSchema();
console.log('Home schema migration applied');

const users = {};
for (const account of DEMO_ACCOUNTS) {
  users[account.role] = await upsertDemoUser(account);
}

const area = await syncDemoShopkeeper(users[UserRole.ADMIN], users[UserRole.SUPER_ADMIN]);
if (area) {
  await seedHomeDemoData({ area });
}

const ownerCount = await syncShopOwnerUsers(User, Shop, ShopUser);
console.log(`Synced ${ownerCount} shop owner user account(s).`);
await sequelize.close();
process.exit(0);
