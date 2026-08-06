export const DEV_OTP = '123456';

export const DEV_DEMO_ACCOUNTS = [
  {
    role: 'Customer',
    phone: '8888888888',
    username: 'customer1',
    email: 'customer@localite.dev',
    password: 'Customer@123',
  },
  {
    role: 'Shop Admin (demo)',
    phone: '9999999999',
    username: 'shopadmin',
    email: 'shopkeeper@localite.dev',
    password: 'Admin@12345',
    note: 'Linked to a demo shop inbox',
  },
  {
    role: 'Super Admin',
    phone: '9000000001',
    username: 'superadmin',
    email: 'superadmin@localite.dev',
    password: 'SuperAdmin@123',
  },
];

export const DEV_SEEDED_SHOP_OWNERS = {
  password: 'Admin@12345',
  phones: [
    { phone: '9876500001', shop: 'Shree Krishna Sweets' },
    { phone: '9876500002', shop: 'Ganesh Namkeen House' },
    { phone: '9876500003', shop: 'LifeCare Pharmacy' },
    { phone: '9876500004', shop: 'Wellness Medical Store' },
    { phone: '9876500005', shop: 'Fresh Farm Vegetables' },
    { phone: '9876500006', shop: 'Green Basket Veg Mart' },
    { phone: '9876500007', shop: 'Daily Needs Grocery' },
    { phone: '9876500008', shop: 'Sahyadri Kirana' },
    { phone: '9876500009', shop: 'Oven Fresh Bakery' },
    { phone: '9876500010', shop: 'City Bakery & Confectionery' },
  ],
};
