import { loadEnv } from '../config/loadEnv.js';
import sequelize from '../database.js';
import { Area, Shop, User, ShopUser, ShopCatalogItem } from '../models/index.js';
import { ShopCategory, ShopOperationalStatus, ShopStatus, UserAccountStatus, UserRole } from '@localite/shared';
import { buildShopCode, ensureShopOwnerUser, linkShopOwner } from '../services/shopService.js';
import { hashPassword } from '../services/cryptoService.js';
import { migrateHomeSchema } from '../services/homeSchemaMigration.js';
import { seedCatalogShops } from './catalogSeed.js';
import { seedHomeDemoData } from './homeSeed.js';

const DEMO_ACCOUNTS = {
  superAdmin: {
    phone: process.env.SUPER_ADMIN_PHONE || '9000000001',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
    email: 'superadmin@localite.dev',
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    username: 'superadmin',
    role: UserRole.SUPER_ADMIN,
  },
  shopAdmin: {
    phone: '9999999999',
    password: 'Admin@12345',
    email: 'shopkeeper@localite.dev',
    name: 'Demo Shopkeeper',
    username: 'shopadmin',
    role: UserRole.ADMIN,
  },
  customer: {
    phone: '8888888888',
    password: 'Customer@123',
    email: 'customer@localite.dev',
    name: 'Demo Customer',
    username: 'customer1',
    role: UserRole.CUSTOMER,
  },
};

async function upsertDemoUser({ phone, password, email, name, username, role }, extra = {}) {
  const [user] = await User.findOrCreate({
    where: { phone },
    defaults: {
      name,
      username,
      email,
      passwordHash: await hashPassword(password),
      role,
      isOnboarded: true,
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      accountStatus: UserAccountStatus.ENABLED,
      isActive: true,
      ...extra,
    },
  });

  await user.update({
    name,
    username,
    email,
    passwordHash: await hashPassword(password),
    role,
    isOnboarded: true,
    phoneVerifiedAt: user.phoneVerifiedAt || new Date(),
    emailVerifiedAt: new Date(),
    accountStatus: UserAccountStatus.ENABLED,
    isActive: true,
    ...extra,
  });

  return user;
}

loadEnv();

const SHOPS = [
  { name: 'Shree Krishna Sweets', category: ShopCategory.SWEETS, ownerName: 'Rajesh Patil', phone: '9876500001', address: 'Main Road, Pimple Saudagar', rank: 1, itemTypes: 'Sweets, Namkeen, Ladoo, Kaju Katli' },
  { name: 'Ganesh Namkeen House', category: ShopCategory.SWEETS, ownerName: 'Suresh Kulkarni', phone: '9876500002', address: 'Kunal Icon, Pimple Saudagar', rank: 2, itemTypes: 'Namkeen, Farsan, Chivda' },
  { name: 'LifeCare Pharmacy', category: ShopCategory.MEDICINES, ownerName: 'Dr. Amit Deshmukh', phone: '9876500003', address: 'Rohan Abhilasha, Pimple Saudagar', rank: 1, itemTypes: 'Medicines, OTC, Health supplements' },
  { name: 'Wellness Medical Store', category: ShopCategory.MEDICINES, ownerName: 'Prakash Jadhav', phone: '9876500004', address: 'Vision One Mall Road', rank: 2, itemTypes: 'Prescription medicines, Ayurvedic' },
  { name: 'Fresh Farm Vegetables', category: ShopCategory.VEGETABLES, ownerName: 'Ramesh Bhosale', phone: '9876500005', address: 'Weekly Market Lane', rank: 1, itemTypes: 'Fresh vegetables, fruits' },
  { name: 'Green Basket Veg Mart', category: ShopCategory.VEGETABLES, ownerName: 'Vijay Shinde', phone: '9876500006', address: 'Kohinoor Arcade', rank: 2, itemTypes: 'Organic vegetables, exotic fruits' },
  { name: 'Daily Needs Grocery', category: ShopCategory.GROCERY, ownerName: 'Mahesh Pawar', phone: '9876500007', address: 'Roseland Residency', rank: 1, itemTypes: 'Grocery, pulses, rice, oil' },
  { name: 'Sahyadri Kirana', category: ShopCategory.GROCERY, ownerName: 'Anil More', phone: '9876500008', address: 'Pimple Saudagar Chowk', rank: 2, itemTypes: 'Kirana, daily essentials' },
  { name: 'Oven Fresh Bakery', category: ShopCategory.BAKERY, ownerName: 'Sunil Gaikwad', phone: '9876500009', address: 'Westend Mall Road', rank: 1, itemTypes: 'Bread, cakes, pastries' },
  { name: 'City Bakery & Confectionery', category: ShopCategory.BAKERY, ownerName: 'Nitin Chavan', phone: '9876500010', address: 'Near D-Mart, Pimple Saudagar', rank: 2, itemTypes: 'Bakery items, cookies' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    try {
      await sequelize.sync({ alter: true });
    } catch (syncErr) {
      console.warn('Schema sync skipped:', syncErr.message);
    }

    const [area] = await Area.findOrCreate({
      where: { name: 'Pimple Saudagar' },
      defaults: { city: 'Pune (PCMC)', isActive: true },
    });
    console.log(`Area: ${area.name}`);

    // Super admin
    const superAdmin = await upsertDemoUser(DEMO_ACCOUNTS.superAdmin);
    console.log(`Super Admin: ${superAdmin.phone} / ${DEMO_ACCOUNTS.superAdmin.password} / ${DEMO_ACCOUNTS.superAdmin.email}`);

    // Demo shops
    for (const [index, shopData] of SHOPS.entries()) {
      const shopCode = buildShopCode(index + 1, shopData.name);
      const [shop] = await Shop.findOrCreate({
        where: { name: shopData.name, areaId: area.id },
        defaults: {
          ...shopData,
          shopCode,
          areaId: area.id,
          status: ShopStatus.APPROVED,
          operationalStatus: ShopOperationalStatus.ENABLED,
          isVerified: true,
          approvedAt: new Date(),
          approvedById: superAdmin.id,
        },
      });
      await shop.update({
        shopCode: shop.shopCode || shopCode,
        operationalStatus: ShopOperationalStatus.ENABLED,
        status: ShopStatus.APPROVED,
        isVerified: true,
      });
      await ensureShopOwnerUser(User, Shop, ShopUser, shop, { setApplicant: false });
      console.log(`  Shop: ${shop.name}`);
    }

    await seedCatalogShops({
      Shop,
      ShopCatalogItem,
      User,
      ShopUser,
      area,
      superAdmin,
      ensureShopOwnerUser,
    });

    // Demo shopkeeper — link to Daily Needs Grocery for easy testing
    const shopAdmin = await upsertDemoUser(DEMO_ACCOUNTS.shopAdmin, {
      address: 'Pimple Saudagar, Pune',
      areaId: area.id,
    });

    const demoShop = await Shop.findOne({
      where: { name: 'Daily Needs Grocery', areaId: area.id },
    }) || await Shop.findOne({ where: { areaId: area.id }, order: [['rank', 'ASC'], ['name', 'ASC']] });

    if (demoShop) {
      await demoShop.update({ phone: shopAdmin.phone, ownerName: shopAdmin.name });
      await linkShopOwner(Shop, ShopUser, demoShop, shopAdmin);
      console.log(`Demo shopkeeper linked to: ${demoShop.name} (${demoShop.shopCode})`);
    }
    console.log(`Demo Admin: ${shopAdmin.phone} / ${DEMO_ACCOUNTS.shopAdmin.password} / ${DEMO_ACCOUNTS.shopAdmin.email}`);

    // Demo customer
    const customer = await upsertDemoUser(DEMO_ACCOUNTS.customer, {
      address: 'Roseland Residency, Pimple Saudagar',
      areaId: area.id,
    });
    console.log(`Demo Customer: ${customer.phone} / ${DEMO_ACCOUNTS.customer.password} / ${DEMO_ACCOUNTS.customer.email}`);

    await migrateHomeSchema();
    await seedHomeDemoData({ area });

    console.log(`Dev OTP (when using phone login): ${process.env.DEV_OTP || '123456'}`);
    console.log('\nSeed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
