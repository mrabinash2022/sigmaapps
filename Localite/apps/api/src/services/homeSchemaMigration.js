import sequelize from '../database.js';

// Home, offers, store info, favorites — keep in sync with docs/app.sql (changelog v0.8)
export async function migrateHomeSchema() {
  await sequelize.query(`
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
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_Offers_scope" AS ENUM ('shop', 'platform');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_Offers_audience" AS ENUM ('customers', 'shopkeepers', 'all');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_Offers_discount_type" AS ENUM ('percent', 'flat', 'text');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
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
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_offers_shop_id ON "Offers"(shop_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_offers_scope_active ON "Offers"(scope, is_active);
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_PlatformAnnouncements_audience" AS ENUM ('shopkeepers', 'customers', 'all');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
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
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "CustomerFavoriteShops" (
      user_id          UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      shop_id          UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
      "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, shop_id)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_favorite_shops_user ON "CustomerFavoriteShops"(user_id);
  `);
}
