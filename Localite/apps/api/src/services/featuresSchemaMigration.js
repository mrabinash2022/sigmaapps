import sequelize from '../database.js';

// v0.9 — addresses, offers on orders, COD collection, delivery radius, notification prefs
export async function migrateFeaturesSchema() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "UserAddresses" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      label VARCHAR(100) NOT NULL DEFAULT 'Home',
      address TEXT NOT NULL,
      area_id UUID REFERENCES "Areas"(id) ON DELETE SET NULL,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON "UserAddresses"(user_id);
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS delivery_address TEXT;
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS delivery_area_id UUID REFERENCES "Areas"(id) ON DELETE SET NULL;
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10,7);
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(10,7);
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS applied_offer_id UUID REFERENCES "Offers"(id) ON DELETE SET NULL;
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10,2);
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2);
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMPTZ;
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS delivery_reminder_at TIMESTAMPTZ;
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS delivery_reminder_sent_at TIMESTAMPTZ;
  `);

  await sequelize.query(`
    ALTER TABLE "Shops"
    ADD COLUMN IF NOT EXISTS delivery_radius_km DECIMAL(6,2);
  `);
  await sequelize.query(`
    ALTER TABLE "Shops"
    ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
  `);

  await sequelize.query(`
    ALTER TABLE "Users"
    ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await sequelize.query(`
    ALTER TABLE "Users"
    ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}
