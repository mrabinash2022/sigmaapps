-- =============================================================================
-- Localite — PostgreSQL schema reference
-- =============================================================================
-- Database : localite_db (default)
-- Keep in sync with: apps/api/src/models/*.js
--                  apps/api/src/services/*SchemaMigration.js
--
-- CHANGELOG
-- ---------
-- 2026-08-08  v0.10 Scheduled orders; OrderRatings; CustomerWishlistItems; catalog CSV import
-- 2026-08-08  v0.9  Saved addresses; order delivery snapshot; offer discounts; COD collection; delivery radius; SMS/WhatsApp prefs; delivery reminders
-- 2026-08-08  v0.8  Cancelled order status; cancellation_reason, cancelled_at; catalog stock (track_stock, stock_quantity)
-- 2026-08-06  v0.7  Partial fulfillment: Backorder_Waiting status; parent_order_id, fulfillment_payload on Orders
-- 2026-08-06  v0.6  Orders Returned status; Refund_Pending/Refunded payment; return_reason, razorpay_refund_id
-- 2026-08-06  v0.5  Orders.order_status Rejected; rejection_reason column
-- 2026-08-06  v0.4  Users.profile_picture_url (profile photos)
-- 2026-08-06  v0.3  SupportTicketMessages table; SupportTickets.raised_by_*
-- 2026-08-06  v0.2  Orders payment fields (payment_method, payment_status, razorpay_*)
-- 2026-08-06  v0.1  Initial MVP schema (areas, users, shops, orders, auth, support)
--
-- Usage (fresh database):
--   psql -U postgres -d localite_db -f docs/app.sql
-- Then optional demo data:
--   psql -U postgres -d localite_db -f docs/seed-data.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE enum_Users_role AS ENUM ('super_admin', 'admin', 'customer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_Users_account_status AS ENUM ('enabled', 'disabled', 'on_hold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE enum_Shops_category AS ENUM ('Sweets', 'Medicines', 'Vegetables', 'Bakery', 'Grocery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_Shops_status AS ENUM ('invited', 'pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_Shops_operational_status AS ENUM ('enabled', 'disabled', 'on_hold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE enum_ShopUsers_role AS ENUM ('owner', 'staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE enum_Orders_order_type AS ENUM ('Text_List', 'Image_Scan'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_Orders_order_status AS ENUM ('Created', 'Accepted', 'Shipped', 'Delivered', 'Rejected', 'Returned', 'Backorder_Waiting'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_Orders_payment_method AS ENUM ('UPI_Instant', 'Cash_On_Delivery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_Orders_payment_status AS ENUM ('Pending', 'Paid', 'Failed', 'Not_Required', 'Refund_Pending', 'Refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE enum_SupportTickets_issue_type AS ENUM ('Delivery_Instruction', 'Wrong_Item', 'Damaged_Product', 'Delayed_Delivery', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_SupportTickets_ticket_status AS ENUM ('Open', 'Acknowledged', 'Resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_SupportTickets_raised_by_role AS ENUM ('customer', 'admin', 'super_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE enum_SupportTicketMessages_sender_role AS ENUM ('customer', 'admin', 'super_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE enum_OtpSessions_channel AS ENUM ('sms', 'email'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_OtpSessions_purpose AS ENUM ('login', 'register'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE enum_UserDevices_platform AS ENUM ('ios', 'android', 'web'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Areas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Areas" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  city         VARCHAR(255) NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Users" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  phone                VARCHAR(255) NOT NULL UNIQUE,
  username             VARCHAR(255) UNIQUE,
  email                VARCHAR(255) UNIQUE,
  password_hash        VARCHAR(255),
  address              TEXT,
  area_id              UUID REFERENCES "Areas"(id) ON DELETE SET NULL,
  role                 enum_Users_role NOT NULL DEFAULT 'customer',
  is_onboarded         BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified_at    TIMESTAMPTZ,
  email_verified_at    TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  account_status       enum_Users_account_status NOT NULL DEFAULT 'enabled',
  last_login_at        TIMESTAMPTZ,
  profile_picture_url  VARCHAR(512),
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_area_id ON "Users"(area_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON "Users"(role);

-- ---------------------------------------------------------------------------
-- Shops
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Shops" (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_code             VARCHAR(255) UNIQUE,
  name                  VARCHAR(255) NOT NULL,
  category              enum_Shops_category NOT NULL,
  owner_name            VARCHAR(255) NOT NULL,
  phone                 VARCHAR(255) NOT NULL,
  address               TEXT NOT NULL,
  latitude              DECIMAL(10, 7),
  longitude             DECIMAL(10, 7),
  item_types            TEXT,
  description           TEXT,
  logo_url              VARCHAR(255),
  rank                  INTEGER NOT NULL DEFAULT 99,
  status                enum_Shops_status NOT NULL DEFAULT 'pending',
  operational_status    enum_Shops_operational_status NOT NULL DEFAULT 'disabled',
  is_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  invited_owner_phone   VARCHAR(255),
  applied_by_id         UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  approved_by_id        UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  "areaId"              UUID REFERENCES "Areas"(id) ON DELETE SET NULL,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_area_id ON "Shops"("areaId");
CREATE INDEX IF NOT EXISTS idx_shops_status ON "Shops"(status);
CREATE INDEX IF NOT EXISTS idx_shops_operational_status ON "Shops"(operational_status);

-- ---------------------------------------------------------------------------
-- ShopUsers (shop staff / owners link table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ShopUsers" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        enum_ShopUsers_role NOT NULL DEFAULT 'owner',
  "shopId"    UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
  "userId"    UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("shopId", "userId")
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Orders" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type           enum_Orders_order_type NOT NULL,
  text_payload         TEXT,
  image_payload_url    VARCHAR(255),
  order_status         enum_Orders_order_status NOT NULL DEFAULT 'Created',
  final_bill_amount    DECIMAL(10, 2),
  delivery_time_window VARCHAR(255),
  payment_method       enum_Orders_payment_method,
  payment_status       enum_Orders_payment_status DEFAULT 'Pending',
  razorpay_order_id    VARCHAR(255),
  razorpay_payment_id  VARCHAR(255),
  rejection_reason     TEXT,
  return_reason        TEXT,
  razorpay_refund_id   VARCHAR(255),
  returned_at          TIMESTAMPTZ,
  parent_order_id      UUID REFERENCES "Orders"(id) ON DELETE SET NULL,
  fulfillment_payload  JSONB,
  "customerId"         UUID NOT NULL REFERENCES "Users"(id) ON DELETE RESTRICT,
  "shopId"             UUID NOT NULL REFERENCES "Shops"(id) ON DELETE RESTRICT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON "Orders"("customerId");
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON "Orders"("shopId");
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON "Orders"(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON "Orders"(payment_status);

-- ---------------------------------------------------------------------------
-- OrderEvents (order state timeline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "OrderEvents" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status VARCHAR(255),
  to_status   VARCHAR(255) NOT NULL,
  note        TEXT,
  "orderId"   UUID NOT NULL REFERENCES "Orders"(id) ON DELETE CASCADE,
  "actorId"   UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON "OrderEvents"("orderId");

-- ---------------------------------------------------------------------------
-- SupportTickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SupportTickets" (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type             enum_SupportTickets_issue_type NOT NULL,
  customer_message       TEXT NOT NULL,
  shopkeeper_resolution  TEXT,
  ticket_status          enum_SupportTickets_ticket_status NOT NULL DEFAULT 'Open',
  raised_by_id           UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  raised_by_role         enum_SupportTickets_raised_by_role,
  "orderId"              UUID NOT NULL REFERENCES "Orders"(id) ON DELETE CASCADE,
  "shopId"               UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
  "customerId"           UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON "SupportTickets"("orderId");
CREATE INDEX IF NOT EXISTS idx_support_tickets_shop_id ON "SupportTickets"("shopId");
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON "SupportTickets"("customerId");
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON "SupportTickets"(ticket_status);

-- ---------------------------------------------------------------------------
-- SupportTicketMessages (threaded support conversation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SupportTicketMessages" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body        TEXT NOT NULL,
  sender_role enum_SupportTicketMessages_sender_role NOT NULL,
  sender_id   UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "ticketId"  UUID NOT NULL REFERENCES "SupportTickets"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON "SupportTicketMessages"("ticketId");
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_id ON "SupportTicketMessages"(sender_id);

-- ---------------------------------------------------------------------------
-- OtpSessions (phone/email OTP for login & registration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "OtpSessions" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target      VARCHAR(255) NOT NULL,
  channel     enum_OtpSessions_channel NOT NULL DEFAULT 'sms',
  purpose     enum_OtpSessions_purpose NOT NULL DEFAULT 'login',
  phone       VARCHAR(255),
  otp_hash    VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  is_used     BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_target ON "OtpSessions"(target);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires_at ON "OtpSessions"(expires_at);

-- ---------------------------------------------------------------------------
-- RefreshTokens (JWT refresh token store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "RefreshTokens" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  VARCHAR(255),
  "userId"    UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON "RefreshTokens"("userId");

-- ---------------------------------------------------------------------------
-- UserDevices (Expo push tokens)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "UserDevices" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expo_push_token VARCHAR(255) NOT NULL,
  platform        enum_UserDevices_platform,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  "userId"        UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON "UserDevices"("userId");

-- ---------------------------------------------------------------------------
-- Incremental migrations (safe to re-run; mirrors API startup migrations)
-- ---------------------------------------------------------------------------
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(512);

ALTER TABLE "SupportTickets" ADD COLUMN IF NOT EXISTS raised_by_id UUID REFERENCES "Users"(id) ON DELETE SET NULL;
DO $$ BEGIN
  ALTER TABLE "SupportTickets" ADD COLUMN raised_by_role enum_SupportTickets_raised_by_role;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

UPDATE "SupportTickets"
SET raised_by_id = "customerId",
    raised_by_role = 'customer'
WHERE raised_by_id IS NULL AND "customerId" IS NOT NULL;

-- v0.8 Home, offers, store info, favorites
CREATE TABLE IF NOT EXISTS "ShopStoreInfos" (
  shop_id          UUID PRIMARY KEY REFERENCES "Shops"(id) ON DELETE CASCADE,
  open_time        VARCHAR(5),
  close_time       VARCHAR(5),
  weekly_off_days  JSONB NOT NULL DEFAULT '[]',
  is_manually_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_message   TEXT,
  closed_until     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN CREATE TYPE "enum_Offers_scope" AS ENUM ('shop', 'platform'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_Offers_audience" AS ENUM ('customers', 'shopkeepers', 'all'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_Offers_discount_type" AS ENUM ('percent', 'flat', 'text'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Offers" (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID REFERENCES "Shops"(id) ON DELETE CASCADE,
  created_by_id    UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  scope            "enum_Offers_scope" NOT NULL DEFAULT 'shop',
  audience         "enum_Offers_audience" NOT NULL DEFAULT 'customers',
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  discount_type    "enum_Offers_discount_type" NOT NULL DEFAULT 'text',
  discount_value   DECIMAL(10, 2),
  banner_image_url VARCHAR(512),
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  show_on_shop_page BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_shop_id ON "Offers"(shop_id);
CREATE INDEX IF NOT EXISTS idx_offers_scope_active ON "Offers"(scope, is_active);

DO $$ BEGIN CREATE TYPE "enum_PlatformAnnouncements_audience" AS ENUM ('shopkeepers', 'customers', 'all'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PlatformAnnouncements" (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_id    UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  audience         "enum_PlatformAnnouncements_audience" NOT NULL DEFAULT 'shopkeepers',
  title            VARCHAR(255) NOT NULL,
  body             TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CustomerFavoriteShops" (
  user_id          UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  shop_id          UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_shops_user ON "CustomerFavoriteShops"(user_id);

COMMIT;

-- =============================================================================
-- Entity relationship summary
-- =============================================================================
-- Areas 1—* Shops, 1—* Users
-- Users *—* Shops via ShopUsers
-- Users 1—* Orders (as customer)
-- Shops 1—* Orders
-- Orders 1—* OrderEvents, 1—* SupportTickets
-- SupportTickets 1—* SupportTicketMessages
-- Users 1—* RefreshTokens, UserDevices, SupportTicketMessages (as sender)
-- Shops 1—1 ShopStoreInfos; Shops 1—* Offers; Users *—* Shops (favorites) via CustomerFavoriteShops
-- PlatformAnnouncements broadcast news to shopkeepers/customers (created by super admin)
-- =============================================================================
