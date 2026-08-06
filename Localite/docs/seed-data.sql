-- =============================================================================
-- Localite — demo / feeder data
-- =============================================================================
-- Run AFTER docs/app.sql (schema must exist).
--
--   psql -U postgres -d localite_db -f docs/seed-data.sql
--
-- Passwords (bcryptjs, 12 rounds):
--   SuperAdmin@123  |  Admin@12345  |  Customer@123
--
-- Prefer Node seed for full owner sync:
--   npm run api:seed
-- =============================================================================

BEGIN;

-- Fixed IDs for repeatable inserts
-- Area
-- Users: super admin, customer, demo shop admin, shop owners 1001–1010
-- Shops: 2001–2010

-- ---------------------------------------------------------------------------
-- Area
-- ---------------------------------------------------------------------------
INSERT INTO "Areas" (id, name, city, is_active, "createdAt", "updatedAt")
VALUES (
  'a0000001-0001-4001-8001-000000000001',
  'Pimple Saudagar',
  'Pune (PCMC)',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  is_active = EXCLUDED.is_active,
  "updatedAt" = NOW();

-- ---------------------------------------------------------------------------
-- Users — demo accounts
-- ---------------------------------------------------------------------------
INSERT INTO "Users" (
  id, name, phone, username, email, password_hash, address, area_id, role,
  is_onboarded, phone_verified_at, email_verified_at, is_active, account_status,
  "createdAt", "updatedAt"
) VALUES
  (
    'b0000001-0001-4001-8001-000000000001',
    'Super Admin',
    '9000000001',
    'superadmin',
    'superadmin@localite.dev',
    '$2a$12$QEVdUPGDaot/d2bwZ50wHeAaTlQWdIGeUZXRS1ousdUYHPk2m03Ke',
    NULL,
    NULL,
    'super_admin',
    TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()
  ),
  (
    'b0000001-0001-4001-8001-000000000002',
    'Demo Customer',
    '8888888888',
    'customer1',
    'customer@localite.dev',
    '$2a$12$oQ4w8WysStNTo/8hmUN6nuJ2FiLyz50JpBi5MTYuGEV3JarlKUney',
    'Roseland Residency, Pimple Saudagar',
    'a0000001-0001-4001-8001-000000000001',
    'customer',
    TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()
  ),
  (
    'b0000001-0001-4001-8001-000000000003',
    'Demo Shopkeeper',
    '9999999999',
    'shopadmin',
    'shopkeeper@localite.dev',
    '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC',
    'Pimple Saudagar, Pune',
    'a0000001-0001-4001-8001-000000000001',
    'admin',
    TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()
  )
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  address = EXCLUDED.address,
  area_id = EXCLUDED.area_id,
  role = EXCLUDED.role,
  is_onboarded = EXCLUDED.is_onboarded,
  phone_verified_at = COALESCE("Users".phone_verified_at, EXCLUDED.phone_verified_at),
  email_verified_at = EXCLUDED.email_verified_at,
  is_active = EXCLUDED.is_active,
  account_status = EXCLUDED.account_status,
  "updatedAt" = NOW();

-- Shop owner users (phones 9876500001–9876500010)
INSERT INTO "Users" (
  id, name, phone, username, email, password_hash, role,
  is_onboarded, phone_verified_at, email_verified_at, is_active, account_status,
  "createdAt", "updatedAt"
) VALUES
  ('c0000001-0001-4001-8001-000000000001', 'Rajesh Patil',       '9876500001', 'owner0001', 'owner0001@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000002', 'Suresh Kulkarni',    '9876500002', 'owner0002', 'owner0002@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000003', 'Dr. Amit Deshmukh',  '9876500003', 'owner0003', 'owner0003@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000004', 'Prakash Jadhav',     '9876500004', 'owner0004', 'owner0004@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000005', 'Ramesh Bhosale',     '9876500005', 'owner0005', 'owner0005@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000006', 'Vijay Shinde',       '9876500006', 'owner0006', 'owner0006@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000007', 'Mahesh Pawar',       '9876500007', 'owner0007', 'owner0007@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000008', 'Anil More',          '9876500008', 'owner0008', 'owner0008@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000009', 'Sunil Gaikwad',      '9876500009', 'owner0009', 'owner0009@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW()),
  ('c0000001-0001-4001-8001-000000000010', 'Nitin Chavan',       '9876500010', 'owner0010', 'owner0010@localite.dev', '$2a$12$SQPvZScXP/t2u6hxob2mTeGPK5E4FZM2qPe5HNBIkLiLS0yn.5slC', 'admin', TRUE, NOW(), NOW(), TRUE, 'enabled', NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_onboarded = EXCLUDED.is_onboarded,
  account_status = EXCLUDED.account_status,
  "updatedAt" = NOW();

-- ---------------------------------------------------------------------------
-- Shops (approved, enabled)
-- ---------------------------------------------------------------------------
INSERT INTO "Shops" (
  id, shop_code, name, category, owner_name, phone, address, item_types, rank,
  status, operational_status, is_verified, approved_by_id, approved_at, "areaId",
  "createdAt", "updatedAt"
) VALUES
  ('d0000001-0001-4001-8001-000000000001', 'SHOP0001-SHREE KRISHNA SWEETS',      'Shree Krishna Sweets',       'Sweets',     'Rajesh Patil',      '9876500001', 'Main Road, Pimple Saudagar',           'Sweets, Namkeen, Ladoo, Kaju Katli', 1, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000002', 'SHOP0002-GANESH NAMKEEN HOUSE',      'Ganesh Namkeen House',       'Sweets',     'Suresh Kulkarni',   '9876500002', 'Kunal Icon, Pimple Saudagar',          'Namkeen, Farsan, Chivda', 2, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000003', 'SHOP0003-LIFECARE PHARMACY',         'LifeCare Pharmacy',          'Medicines',  'Dr. Amit Deshmukh', '9876500003', 'Rohan Abhilasha, Pimple Saudagar',     'Medicines, OTC, Health supplements', 1, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000004', 'SHOP0004-WELLNESS MEDICAL STORE',    'Wellness Medical Store',     'Medicines',  'Prakash Jadhav',    '9876500004', 'Vision One Mall Road',                 'Prescription medicines, Ayurvedic', 2, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000005', 'SHOP0005-FRESH FARM VEGETABLES',     'Fresh Farm Vegetables',      'Vegetables', 'Ramesh Bhosale',    '9876500005', 'Weekly Market Lane',                   'Fresh vegetables, fruits', 1, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000006', 'SHOP0006-GREEN BASKET VEG MART',      'Green Basket Veg Mart',      'Vegetables', 'Vijay Shinde',      '9876500006', 'Kohinoor Arcade',                      'Organic vegetables, exotic fruits', 2, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000007', 'SHOP0007-DAILY NEEDS GROCERY',       'Daily Needs Grocery',        'Grocery',    'Mahesh Pawar',      '9876500007', 'Roseland Residency',                   'Grocery, pulses, rice, oil', 1, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000008', 'SHOP0008-SAHYADRI KIRANA',            'Sahyadri Kirana',            'Grocery',    'Anil More',         '9876500008', 'Pimple Saudagar Chowk',                'Kirana, daily essentials', 2, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000009', 'SHOP0009-OVEN FRESH BAKERY',          'Oven Fresh Bakery',          'Bakery',     'Sunil Gaikwad',     '9876500009', 'Westend Mall Road',                    'Bread, cakes, pastries', 1, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d0000001-0001-4001-8001-000000000010', 'SHOP0010-CITY BAKERY CONFECTIONERY',  'City Bakery & Confectionery','Bakery',     'Nitin Chavan',      '9876500010', 'Near D-Mart, Pimple Saudagar',         'Bakery items, cookies', 2, 'approved', 'enabled', TRUE, 'b0000001-0001-4001-8001-000000000001', NOW(), 'a0000001-0001-4001-8001-000000000001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  shop_code = EXCLUDED.shop_code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  owner_name = EXCLUDED.owner_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  item_types = EXCLUDED.item_types,
  rank = EXCLUDED.rank,
  status = EXCLUDED.status,
  operational_status = EXCLUDED.operational_status,
  is_verified = EXCLUDED.is_verified,
  approved_by_id = EXCLUDED.approved_by_id,
  approved_at = EXCLUDED.approved_at,
  "areaId" = EXCLUDED."areaId",
  "updatedAt" = NOW();

-- Demo shopkeeper linked to Daily Needs Grocery
UPDATE "Shops"
SET phone = '9999999999', owner_name = 'Demo Shopkeeper'
WHERE id = 'd0000001-0001-4001-8001-000000000007';

-- ---------------------------------------------------------------------------
-- ShopUsers — link owners to shops
-- ---------------------------------------------------------------------------
INSERT INTO "ShopUsers" (id, role, "shopId", "userId", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000002', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000003', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000004', 'c0000001-0001-4001-8001-000000000004', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000005', 'c0000001-0001-4001-8001-000000000005', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000006', 'c0000001-0001-4001-8001-000000000006', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000007', 'b0000001-0001-4001-8001-000000000003', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000008', 'c0000001-0001-4001-8001-000000000008', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000009', 'c0000001-0001-4001-8001-000000000009', NOW(), NOW()),
  (gen_random_uuid(), 'owner', 'd0000001-0001-4001-8001-000000000010', 'c0000001-0001-4001-8001-000000000010', NOW(), NOW())
ON CONFLICT ("shopId", "userId") DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sample order (optional — customer → Daily Needs Grocery)
-- ---------------------------------------------------------------------------
INSERT INTO "Orders" (
  id, order_type, text_payload, order_status, payment_status,
  "customerId", "shopId", "createdAt", "updatedAt"
) VALUES (
  'e0000001-0001-4001-8001-000000000001',
  'Text_List',
  '1kg rice, 500g toor dal, 2 packets biscuits',
  'Created',
  'Pending',
  'b0000001-0001-4001-8001-000000000002',
  'd0000001-0001-4001-8001-000000000007',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "OrderEvents" (id, from_status, to_status, note, "orderId", "actorId", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  NULL,
  'Created',
  'Order placed by customer',
  'e0000001-0001-4001-8001-000000000001',
  'b0000001-0001-4001-8001-000000000002',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Dev OTP (not stored here — generated at runtime): 123456
