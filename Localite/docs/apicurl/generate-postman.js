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
        req('Get Me', 'GET', '/api/auth/me', {
          desc: 'Returns current user. Shop admins include user.shops[].bulkBuyEnabled (bulk buy partner flag).',
        }),
        req('Update Profile', 'PATCH', '/api/auth/profile', { body: { name: 'Updated Name', address: '123 Main St', smsNotificationsEnabled: true, whatsappNotificationsEnabled: false } }),
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
        req('Update My Shop', 'PATCH', '/api/shops/my/{{shopId}}', { body: { phone: '9999999999', address: 'New addr', deliveryRadiusKm: 5, lowStockThreshold: 10 } }),
        req('List Staff', 'GET', '/api/shops/my/{{shopId}}/staff'),
        req('Invite Staff', 'POST', '/api/shops/my/{{shopId}}/staff/invite', { body: { phone: '9876543210', name: 'Staff Member' } }),
        req('Remove Staff', 'DELETE', '/api/shops/my/{{shopId}}/staff/{{userId}}'),
        req('Low Stock Items', 'GET', '/api/shops/my/{{shopId}}/low-stock'),
        req('Get Store Info', 'GET', '/api/shops/my/{{shopId}}/store-info'),
        req('Update Store Info', 'PUT', '/api/shops/my/{{shopId}}/store-info', { body: { openTime: '09:00', closeTime: '21:00', weeklyOffDays: [0], acceptingOrders: true } }),
        req('List Shop Offers', 'GET', '/api/shops/my/{{shopId}}/offers'),
        req('Create Shop Offer', 'POST', '/api/shops/my/{{shopId}}/offers', {
          formdata: [
            { key: 'title', value: '10% off', type: 'text' },
            { key: 'discountType', value: 'Percentage', type: 'text' },
            { key: 'discountValue', value: '10', type: 'text' },
            { key: 'isActive', value: 'true', type: 'text' },
          ],
        }),
        req('Update Shop Offer', 'PATCH', '/api/shops/my/{{shopId}}/offers/{{offerId}}', {
          formdata: [{ key: 'discountValue', value: '15', type: 'text' }],
        }),
        req('Delete Shop Offer', 'DELETE', '/api/shops/my/{{shopId}}/offers/{{offerId}}'),
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
        req('Import CSV', 'POST', '/api/shops/my/{{shopId}}/catalog/import-csv', {
          body: {
            csv: 'name,itemGroup,price,unit\nBasmati Rice 5kg,rice,450,kg\nSunflower Oil 1L,oil,140,litre',
            publish: true,
          },
        }),
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
            { key: 'addressId', value: '{{addressId}}', type: 'text' },
            { key: 'scheduledWindow', value: 'Tomorrow 9-11 AM', type: 'text' },
          ],
        }),
        req('Submit Catalog Order', 'POST', '/api/orders/submit-catalog-order', {
          body: {
            shopId: '{{shopId}}',
            items: [{ catalogItemId: '{{itemId}}', name: 'Product', quantity: 1, unitPrice: 100 }],
            note: 'Deliver by 6 PM',
            addressId: '{{addressId}}',
            scheduledWindow: 'Tomorrow 9-11 AM',
          },
        }),
        req('Reorder', 'POST', '/api/orders/reorder/{{orderId}}'),
        req('My Orders', 'GET', '/api/orders/my'),
        req('Shop Orders', 'GET', '/api/orders/shop/{{shopId}}'),
        req('Get Order', 'GET', '/api/orders/{{orderId}}'),
        req('Pricing Preview', 'POST', '/api/orders/pricing-preview', { body: { shopId: '{{shopId}}', subtotalAmount: 500, offerId: '{{offerId}}' } }),
        req('Accept Order', 'PATCH', '/api/orders/transition/accept/{{orderId}}', { body: { finalBillAmount: 450, deliveryTimeWindow: 'Today 6-8 PM', subtotalAmount: 500, offerId: '{{offerId}}' } }),
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
        req('Cancel Order', 'PATCH', '/api/orders/transition/cancel/{{orderId}}', { body: { reason: 'Ordered by mistake' } }),
        req('Select Payment (COD)', 'PATCH', '/api/orders/transition/select-payment/{{orderId}}', { body: { paymentMethod: 'Cash_On_Delivery' } }),
        req('Select Payment (UPI)', 'PATCH', '/api/orders/transition/select-payment/{{orderId}}', { body: { paymentMethod: 'UPI_Instant' } }),
        req('Create Razorpay Order', 'POST', '/api/orders/transition/create-razorpay-order/{{orderId}}'),
        req('Verify Payment', 'POST', '/api/orders/transition/verify-payment/{{orderId}}', { body: { razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'sig_x' } }),
        req('Mock Pay (dev)', 'PATCH', '/api/orders/transition/pay/{{orderId}}'),
        req('COD Collect', 'PATCH', '/api/orders/transition/cod-collect/{{orderId}}'),
        req('Ship Order', 'PATCH', '/api/orders/transition/ship/{{orderId}}'),
        req('Deliver Order', 'PATCH', '/api/orders/transition/deliver/{{orderId}}'),
        req('Return Order', 'PATCH', '/api/orders/transition/return/{{orderId}}', { body: { reason: 'Wrong items' } }),
        req('Refund Order', 'POST', '/api/orders/transition/refund/{{orderId}}'),
      ],
    },
    {
      name: 'Home',
      item: [
        req('Customer Home', 'GET', '/api/home/customer'),
        req('Shopkeeper Home', 'GET', '/api/home/shopkeeper'),
        req('Super Admin Home', 'GET', '/api/home/super-admin?metric=revenue&limit=10'),
        req('List Favorites', 'GET', '/api/home/favorites'),
        req('Add Favorite', 'POST', '/api/home/favorites/{{shopId}}'),
        req('Remove Favorite', 'DELETE', '/api/home/favorites/{{shopId}}'),
      ],
    },
    {
      name: 'Reports',
      item: [
        req('Order Report (JSON)', 'GET', '/api/reports/orders?preset=week'),
        req('Export Report (Excel)', 'GET', '/api/reports/orders/export?preset=week&format=xlsx'),
        req('Export Report (PDF)', 'GET', '/api/reports/orders/export?preset=week&format=pdf'),
      ],
    },
    {
      name: 'Addresses',
      item: [
        req('List Addresses', 'GET', '/api/addresses'),
        req('Create Address', 'POST', '/api/addresses', { body: { label: 'Home', address: 'Flat 12, Roseland Residency', areaId: '{{areaId}}', isDefault: true } }),
        req('Update Address', 'PATCH', '/api/addresses/{{addressId}}', { body: { label: 'Office', address: 'Tech Park' } }),
        req('Delete Address', 'DELETE', '/api/addresses/{{addressId}}'),
      ],
    },
    {
      name: 'Wishlist',
      item: [
        req('List Wishlist', 'GET', '/api/wishlist'),
        req('Wishlist IDs', 'GET', '/api/wishlist/ids?shopId={{shopId}}'),
        req('Add to Wishlist', 'POST', '/api/wishlist', { body: { catalogItemId: '{{itemId}}' } }),
        req('Remove from Wishlist', 'DELETE', '/api/wishlist/{{itemId}}'),
      ],
    },
    {
      name: 'Ratings',
      item: [
        req('Rate Order', 'POST', '/api/ratings/orders/{{orderId}}', { body: { rating: 5, comment: 'Great service' } }),
        req('Get Order Rating', 'GET', '/api/ratings/orders/{{orderId}}'),
      ],
    },
    {
      name: 'Analytics',
      item: [
        req('Platform Analytics', 'GET', '/api/analytics/platform?days=30'),
        req('Shop Insights', 'GET', '/api/analytics/shop/{{shopId}}?days=30'),
      ],
    },
    {
      name: 'Bulk Buy',
      item: [
        req('List Campaigns', 'GET', '/api/bulk-buy/campaigns?areaId={{areaId}}'),
        req('Create Campaign (Customer)', 'POST', '/api/bulk-buy/campaigns', {
          body: {
            title: 'Bulk buy refrigerator',
            productCategory: 'refrigerator',
            brandPreference: 'LG',
            minSubscribers: 10,
            areaId: '{{areaId}}',
          },
        }),
        req('Create Campaign (Store)', 'POST', '/api/bulk-buy/campaigns', {
          body: {
            title: 'Store bulk TV fest',
            productCategory: 'television',
            minSubscribers: 10,
            shopId: '{{shopId}}',
            areaId: '{{areaId}}',
          },
        }),
        req('Get Campaign', 'GET', '/api/bulk-buy/campaigns/{{campaignId}}'),
        req('Subscribe', 'POST', '/api/bulk-buy/campaigns/{{campaignId}}/subscribe'),
        req('Unsubscribe', 'DELETE', '/api/bulk-buy/campaigns/{{campaignId}}/subscribe'),
        req('My Campaigns', 'GET', '/api/bulk-buy/campaigns/mine'),
        req('Store Inbox', 'GET', '/api/bulk-buy/campaigns/inbox'),
        req('List Offers', 'GET', '/api/bulk-buy/campaigns/{{campaignId}}/offers'),
        req('Submit Store Offer', 'POST', '/api/bulk-buy/campaigns/{{campaignId}}/offers', {
          body: {
            shopId: '{{shopId}}',
            discountType: 'percent',
            discountValue: 12,
            termsText: 'Valid when all buyers purchase within 30 days',
            extras: { extendedWarrantyMonths: 12, installation: true, freebies: 'Gift voucher' },
          },
        }),
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
        req('Update Shop', 'PATCH', '/api/admin/shops/{{shopId}}', { body: { name: 'Quick Mart Updated', phone: '9876543210', rank: 5, bulkBuyEnabled: true } }),
        req('Enable Bulk Buy Partner', 'PATCH', '/api/admin/shops/{{shopId}}', {
          body: { bulkBuyEnabled: true },
          desc: 'Allow shop to create store campaigns, view inbox, and submit offers.',
        }),
        req('Disable Bulk Buy Partner', 'PATCH', '/api/admin/shops/{{shopId}}', {
          body: { bulkBuyEnabled: false },
          desc: 'Revoke bulk buy access for shopkeepers. Customers are unaffected.',
        }),
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
        req('List Platform Offers', 'GET', '/api/admin/platform-offers'),
        req('Create Platform Offer', 'POST', '/api/admin/platform-offers', {
          formdata: [
            { key: 'title', value: 'Free delivery', type: 'text' },
            { key: 'discountType', value: 'Flat', type: 'text' },
            { key: 'discountValue', value: '50', type: 'text' },
            { key: 'isActive', value: 'true', type: 'text' },
          ],
        }),
        req('Update Platform Offer', 'PATCH', '/api/admin/platform-offers/{{offerId}}', {
          formdata: [{ key: 'isActive', value: 'false', type: 'text' }],
        }),
        req('Delete Platform Offer', 'DELETE', '/api/admin/platform-offers/{{offerId}}'),
        req('List Announcements', 'GET', '/api/admin/announcements'),
        req('Create Announcement', 'POST', '/api/admin/announcements', {
          body: { title: 'Maintenance', body: 'Tonight 2-3 AM', audience: 'Shopkeepers', isActive: true },
        }),
        req('Update Announcement', 'PATCH', '/api/admin/announcements/{{announcementId}}', { body: { isActive: false } }),
        req('Delete Announcement', 'DELETE', '/api/admin/announcements/{{announcementId}}'),
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
