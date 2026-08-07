import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'localite.postman_collection.json');

const authHeader = [{ key: 'Authorization', value: 'Bearer {{accessToken}}', type: 'text' }];
const jsonHeader = [{ key: 'Content-Type', value: 'application/json', type: 'text' }];

const loginTest = [
  'if (pm.response.code === 200 || pm.response.code === 201) {',
  '  const j = pm.response.json();',
  "  if (j.accessToken) pm.environment.set('accessToken', j.accessToken);",
  "  if (j.refreshToken) pm.environment.set('refreshToken', j.refreshToken);",
  '}',
];

function req(name, method, url, { body, formdata, auth = true, desc, test } = {}) {
  const item = {
    name,
    request: {
      method,
      header: auth ? authHeader : (body ? jsonHeader : []),
      url: `{{baseUrl}}${url}`,
      description: desc || '',
    },
  };
  if (body) item.request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  if (formdata) item.request.body = { mode: 'formdata', formdata };
  if (test) item.event = [{ listen: 'test', script: { type: 'text/javascript', exec: test } }];
  return item;
}

const collection = {
  info: {
    name: 'Localite API',
    description: 'Full Localite API. Import localite.postman_environment.json and run Login first.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    { name: 'Health', item: [req('Health Check', 'GET', '/api/health', { auth: false })] },
    {
      name: 'Auth',
      item: [
        req('Captcha', 'GET', '/api/auth/captcha', { auth: false }),
        req('Send Email Code', 'POST', '/api/auth/register/send-email-code', { auth: false, body: { email: 'user@example.com' } }),
        req('Verify Email Code', 'POST', '/api/auth/register/verify-email-code', { auth: false, body: { email: 'user@example.com', code: '123456' } }),
        req('Register (Customer)', 'POST', '/api/auth/register/password', { auth: false, body: { name: 'Test User', phone: '7777777777', password: 'Test@12345', role: 'customer' }, test: loginTest }),
        req('Login (Super Admin)', 'POST', '/api/auth/login/password', { auth: false, body: { identifier: '{{superAdminPhone}}', password: '{{superAdminPassword}}' }, test: loginTest }),
        req('Login (Shop Admin)', 'POST', '/api/auth/login/password', { auth: false, body: { identifier: '{{shopAdminPhone}}', password: '{{shopAdminPassword}}' }, test: loginTest }),
        req('Login (Customer)', 'POST', '/api/auth/login/password', { auth: false, body: { identifier: '{{customerPhone}}', password: '{{customerPassword}}' }, test: loginTest }),
        req('Send OTP', 'POST', '/api/auth/send-otp', { auth: false, body: { phone: '{{customerPhone}}' } }),
        req('Verify OTP', 'POST', '/api/auth/verify-otp', { auth: false, body: { phone: '{{customerPhone}}', otp: '{{devOtp}}' }, test: loginTest }),
        req('Refresh Token', 'POST', '/api/auth/refresh', { auth: false, body: { refreshToken: '{{refreshToken}}' } }),
        req('Logout', 'POST', '/api/auth/logout', { body: { refreshToken: '{{refreshToken}}' } }),
        req('Get Me', 'GET', '/api/auth/me'),
        req('Update Profile', 'PATCH', '/api/auth/profile', { body: { name: 'Updated Name', address: '123 Main St' } }),
        req('Upload Profile Picture', 'POST', '/api/auth/profile/picture', {
          formdata: [{ key: 'picture', type: 'file', src: [] }],
        }),
        req('Onboard Customer', 'POST', '/api/auth/onboard/customer', { body: { name: 'Customer', address: 'Home', areaId: '{{areaId}}' } }),
        req('Onboard Admin', 'POST', '/api/auth/onboard/admin', { body: { name: 'Shop Owner', address: 'Shop address' } }),
        req('Set Password', 'POST', '/api/auth/set-password', { body: { password: 'NewPass@123', currentPassword: '{{customerPassword}}' } }),
        req('Register Device', 'POST', '/api/auth/device/register', { body: { expoPushToken: 'ExponentPushToken[test]', platform: 'android' } }),
        req('Unregister Device', 'POST', '/api/auth/device/unregister', { body: { expoPushToken: 'ExponentPushToken[test]' } }),
      ],
    },
    {
      name: 'Areas',
      item: [
        req('List Areas', 'GET', '/api/areas', { auth: false }),
        req('Get Area', 'GET', '/api/areas/{{areaId}}', { auth: false }),
      ],
    },
    {
      name: 'Shops',
      item: [
        req('List Shops by Area', 'GET', '/api/shops/area/{{areaId}}?page=1&limit=20', { auth: false }),
        req('Get Shop', 'GET', '/api/shops/{{shopId}}', { auth: false }),
        req('Get Shop Catalog', 'GET', '/api/shops/{{shopId}}/catalog', { auth: false }),
        req('Apply for Shop', 'POST', '/api/shops/apply', { body: { name: 'My Store', category: 'Grocery', address: 'Main Rd', phone: '9999999999', areaId: '{{areaId}}', itemTypes: 'Grocery' } }),
        req('My Invitations', 'GET', '/api/shops/my/invitations'),
        req('Complete Registration', 'POST', '/api/shops/{{shopId}}/complete-registration', { body: { name: 'Store Name', category: 'Grocery', address: 'Addr', phone: '9999999999', areaId: '{{areaId}}' } }),
        req('My Applications', 'GET', '/api/shops/my/application'),
        req('Update My Shop', 'PATCH', '/api/shops/my/{{shopId}}', { body: { phone: '9999999999', address: 'New addr' } }),
      ],
    },
    {
      name: 'Catalog (Shopkeeper)',
      item: [
        req('Manage Catalog', 'GET', '/api/shops/my/{{shopId}}/catalog/manage'),
        req('Create Item', 'POST', '/api/shops/my/{{shopId}}/catalog/items', {
          formdata: [
            { key: 'name', value: 'Red Rose Bouquet', type: 'text' },
            { key: 'itemGroup', value: 'flowers', type: 'text' },
            { key: 'price', value: '299', type: 'text' },
            { key: 'publish', value: 'true', type: 'text' },
          ],
        }),
        req('Update Item', 'PATCH', '/api/shops/my/{{shopId}}/catalog/items/{{itemId}}', {
          formdata: [
            { key: 'name', value: 'Updated Bouquet', type: 'text' },
            { key: 'price', value: '349', type: 'text' },
          ],
        }),
        req('Publish Item', 'PATCH', '/api/shops/my/{{shopId}}/catalog/items/{{itemId}}/publish'),
        req('Unpublish Item', 'PATCH', '/api/shops/my/{{shopId}}/catalog/items/{{itemId}}/unpublish'),
        req('Delete Item', 'DELETE', '/api/shops/my/{{shopId}}/catalog/items/{{itemId}}'),
        req('Enable Visual Catalog', 'PATCH', '/api/shops/my/{{shopId}}/visual-catalog', { body: { enabled: true } }),
      ],
    },
    {
      name: 'Orders',
      item: [
        req('Submit Order (text)', 'POST', '/api/orders/submit-flexible-order', {
          formdata: [
            { key: 'shopId', value: '{{shopId}}', type: 'text' },
            { key: 'textPayload', value: '2kg rice, 1L oil', type: 'text' },
          ],
        }),
        req('Submit Catalog Order', 'POST', '/api/orders/submit-catalog-order', {
          body: {
            shopId: '{{shopId}}',
            items: [{ catalogItemId: '{{itemId}}', name: 'Product', quantity: 1, unitPrice: 100 }],
            note: 'Deliver by 6 PM',
          },
        }),
        req('Reorder', 'POST', '/api/orders/reorder/{{orderId}}'),
        req('My Orders', 'GET', '/api/orders/my'),
        req('Shop Orders', 'GET', '/api/orders/shop/{{shopId}}'),
        req('Get Order', 'GET', '/api/orders/{{orderId}}'),
        req('Accept Order', 'PATCH', '/api/orders/transition/accept/{{orderId}}', { body: { finalBillAmount: 450, deliveryTimeWindow: 'Today 6-8 PM' } }),
        req('Accept Partial + Backorder', 'PATCH', '/api/orders/transition/accept/{{orderId}}', {
          body: {
            finalBillAmount: 380,
            deliveryTimeWindow: 'Today 6-8 PM',
            createBackorder: true,
            fulfillment: { shopNote: 'Partial stock', lines: [] },
          },
        }),
        req('Backorder Ready', 'PATCH', '/api/orders/transition/backorder-ready/{{orderId}}', { body: { finalBillAmount: 260, deliveryTimeWindow: 'Tomorrow morning' } }),
        req('Reject Order', 'PATCH', '/api/orders/transition/reject/{{orderId}}', { body: { reason: 'Out of stock' } }),
        req('Select Payment (COD)', 'PATCH', '/api/orders/transition/select-payment/{{orderId}}', { body: { paymentMethod: 'Cash_On_Delivery' } }),
        req('Select Payment (UPI)', 'PATCH', '/api/orders/transition/select-payment/{{orderId}}', { body: { paymentMethod: 'UPI_Instant' } }),
        req('Create Razorpay Order', 'POST', '/api/orders/transition/create-razorpay-order/{{orderId}}'),
        req('Verify Payment', 'POST', '/api/orders/transition/verify-payment/{{orderId}}', { body: { razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'sig_x' } }),
        req('Mock Pay (dev)', 'PATCH', '/api/orders/transition/pay/{{orderId}}'),
        req('Ship Order', 'PATCH', '/api/orders/transition/ship/{{orderId}}'),
        req('Deliver Order', 'PATCH', '/api/orders/transition/deliver/{{orderId}}'),
        req('Return Order', 'PATCH', '/api/orders/transition/return/{{orderId}}', { body: { reason: 'Wrong items' } }),
        req('Refund Order', 'POST', '/api/orders/transition/refund/{{orderId}}'),
      ],
    },
    {
      name: 'App',
      item: [
        req('App Info', 'GET', '/api/app/info'),
        req('Send Referral', 'POST', '/api/app/refer', { body: { phone: '9876543210', email: 'friend@example.com' } }),
        req('Submit Client Logs', 'POST', '/api/logs/client', {
          auth: false,
          body: { logs: [{ level: 'info', message: 'Test log', platform: 'android' }] },
        }),
      ],
    },
    {
      name: 'Admin',
      item: [
        req('Pending Shops', 'GET', '/api/admin/shops/pending'),
        req('Approve Shop', 'PATCH', '/api/admin/shops/{{shopId}}/approve', { body: { rank: 10 } }),
        req('Reject Shop', 'PATCH', '/api/admin/shops/{{shopId}}/reject', { body: { rejectionReason: 'Not approved' } }),
        req('All Shops', 'GET', '/api/admin/shops'),
        req('Invite Shop', 'POST', '/api/admin/shops/invite', { body: { shopCode: 'LCT-TEST01', ownerPhone: '9999999999', areaId: '{{areaId}}' } }),
        req('Create Shop (direct)', 'POST', '/api/admin/shops', { body: { shopCode: 'LCT-DIR01', name: 'Quick Mart', category: 'Grocery', address: 'Road', phone: '9876543210', areaId: '{{areaId}}' } }),
        req('Update Shop', 'PATCH', '/api/admin/shops/{{shopId}}', { body: { name: 'Quick Mart Updated', phone: '9876543210', rank: 5 } }),
        req('Enable Shop', 'PATCH', '/api/admin/shops/{{shopId}}/operational-status', { body: { operationalStatus: 'enabled' } }),
        req('Disable Shop', 'PATCH', '/api/admin/shops/{{shopId}}/operational-status', { body: { operationalStatus: 'disabled' } }),
        req('On Hold Shop', 'PATCH', '/api/admin/shops/{{shopId}}/operational-status', { body: { operationalStatus: 'on_hold' } }),
        req('Delete Shop', 'DELETE', '/api/admin/shops/{{shopId}}'),
        req('Create Area', 'POST', '/api/admin/areas', { body: { name: 'Pimple Saudagar', city: 'Pune (PCMC)' } }),
        req('List Users', 'GET', '/api/admin/users?page=1&limit=20'),
        req('Create User', 'POST', '/api/admin/users', { body: { name: 'New Customer', phone: '7777777771', password: 'Customer@123', role: 'customer', areaId: '{{areaId}}' } }),
        req('Update User', 'PATCH', '/api/admin/users/{{userId}}', { body: { name: 'Updated Name', address: 'New address' } }),
        req('Set User Account Status', 'PATCH', '/api/admin/users/{{userId}}/account-status', { body: { accountStatus: 'disabled' } }),
        req('Delete User', 'DELETE', '/api/admin/users/{{userId}}'),
        req('Change User Role', 'PATCH', '/api/admin/users/{{userId}}/role', { body: { role: 'admin' } }),
      ],
    },
    {
      name: 'Support',
      item: [
        req('Create Ticket', 'POST', '/api/support/create-ticket', { body: { orderId: '{{orderId}}', issueType: 'Wrong_Item', customerMessage: 'Wrong item received' } }),
        req('My Tickets', 'GET', '/api/support/my'),
        req('Order Tickets', 'GET', '/api/support/order/{{orderId}}'),
        req('Add Ticket Message', 'POST', '/api/support/tickets/{{ticketId}}/messages', { body: { message: 'Follow-up message' } }),
        req('Shop Active Tickets', 'GET', '/api/support/merchant/active/{{shopId}}'),
        req('Update Ticket', 'PATCH', '/api/support/update-ticket/{{ticketId}}', { body: { ticketStatus: 'Acknowledged', shopkeeperResolution: 'Looking into it' } }),
      ],
    },
    {
      name: 'Webhooks',
      item: [
        req('Razorpay Webhook', 'POST', '/api/webhooks/razorpay', { auth: false, body: { event: 'payment.captured', payload: {} }, desc: 'Requires x-razorpay-signature header' }),
      ],
    },
  ],
};

fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));
console.log('Generated', outPath);
