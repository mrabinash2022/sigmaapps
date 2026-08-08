import Constants from 'expo-constants';

export const DEV_OTP = '123456';

export const DEMO_CUSTOMER_PASSWORD = 'Customer@123';
export const DEMO_STORE_PASSWORD = 'Admin@12345';

/** Visible in Metro dev builds and Expo Go; hidden in production store builds. */
export function shouldShowDevDemoAccounts() {
  if (Constants.expoConfig?.extra?.hideDemoAccounts) return false;
  if (Constants.expoConfig?.extra?.showDemoAccounts === false) return false;
  return __DEV__ || Constants.appOwnership === 'expo';
}

export const DEV_DEMO_CUSTOMERS = [
  {
    label: 'customer-1',
    phone: '8888888888',
    username: 'customer1',
    email: 'customer@localite.dev',
    password: DEMO_CUSTOMER_PASSWORD,
  },
  {
    label: 'customer-2',
    phone: '8888888802',
    username: 'customer2',
    email: 'customer2@localite.dev',
    password: DEMO_CUSTOMER_PASSWORD,
  },
  {
    label: 'customer-3',
    phone: '8888888803',
    username: 'customer3',
    email: 'customer3@localite.dev',
    password: DEMO_CUSTOMER_PASSWORD,
  },
  {
    label: 'customer-4',
    phone: '8888888804',
    username: 'customer4',
    email: 'customer4@localite.dev',
    password: DEMO_CUSTOMER_PASSWORD,
  },
  {
    label: 'customer-5',
    phone: '8888888805',
    username: 'customer5',
    email: 'customer5@localite.dev',
    password: DEMO_CUSTOMER_PASSWORD,
  },
];

export const DEV_DEMO_STORES = [
  {
    label: 'store-1',
    phone: '9876500001',
    shop: 'Shree Krishna Sweets',
    password: DEMO_STORE_PASSWORD,
  },
  {
    label: 'store-2',
    phone: '9876500002',
    shop: 'Ganesh Namkeen House',
    password: DEMO_STORE_PASSWORD,
  },
  {
    label: 'store-3',
    phone: '9876500003',
    shop: 'LifeCare Pharmacy',
    password: DEMO_STORE_PASSWORD,
  },
  {
    label: 'store-4',
    phone: '9876500004',
    shop: 'Wellness Medical Store',
    password: DEMO_STORE_PASSWORD,
  },
  {
    label: 'store-5',
    phone: '9876500005',
    shop: 'Fresh Farm Vegetables',
    password: DEMO_STORE_PASSWORD,
  },
];

export const DEV_DEMO_SUPER_ADMIN = {
  label: 'super-admin',
  role: 'Super Admin',
  phone: '9000000001',
  username: 'superadmin',
  email: 'superadmin@localite.dev',
  password: 'SuperAdmin@123',
};

/** @deprecated Use DEV_DEMO_CUSTOMERS / DEV_DEMO_STORES */
export const DEV_DEMO_ACCOUNTS = [
  { role: 'Super Admin', ...DEV_DEMO_SUPER_ADMIN },
];

/** Extra seeded shop owners beyond the 5 demo stores */
export const DEV_SEEDED_SHOP_OWNERS = {
  password: DEMO_STORE_PASSWORD,
  phones: [
    { phone: '9876500006', shop: 'Green Basket Veg Mart' },
    { phone: '9876500007', shop: 'Daily Needs Grocery' },
    { phone: '9876500008', shop: 'Sahyadri Kirana' },
    { phone: '9876500009', shop: 'Oven Fresh Bakery' },
    { phone: '9876500010', shop: 'City Bakery & Confectionery' },
    { phone: '9876500011', shop: 'Pooja & Flowers Corner', note: 'Flowers & pooja catalog' },
    { phone: '9876500012', shop: 'Green Roots Nursery', note: 'Plants & garden catalog' },
  ],
};
