import sequelize from '../database.js';

// Keep in sync with docs/app.sql (changelog v0.7)
export async function migrateCatalogSchema() {
  const shopCategories = ['Flowers', 'Nursery'];
  for (const value of shopCategories) {
    await sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_Shops_category' AND e.enumlabel = '${value}'
        ) THEN
          ALTER TYPE "enum_Shops_category" ADD VALUE '${value}';
        END IF;
      END $$;
    `);
  }

  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_Orders_order_type' AND e.enumlabel = 'Catalog'
      ) THEN
        ALTER TYPE "enum_Orders_order_type" ADD VALUE 'Catalog';
      END IF;
    END $$;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "ShopCatalogItems" (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id      UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
      item_group   VARCHAR(64) NOT NULL,
      name         VARCHAR(255) NOT NULL,
      description  TEXT,
      image_url    VARCHAR(512),
      price        DECIMAL(10, 2) NOT NULL,
      size_label   VARCHAR(64),
      unit         VARCHAR(32) DEFAULT 'piece',
      sort_order   INTEGER NOT NULL DEFAULT 0,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_shop_catalog_items_shop_id
    ON "ShopCatalogItems"(shop_id);
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS catalog_payload JSONB;
  `);

  await sequelize.query(`
    ALTER TABLE "Shops"
    ADD COLUMN IF NOT EXISTS visual_catalog_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_ShopCatalogItems_publish_status" AS ENUM ('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE "ShopCatalogItems"
    ADD COLUMN IF NOT EXISTS publish_status "enum_ShopCatalogItems_publish_status" NOT NULL DEFAULT 'published';
  `);

  await sequelize.query(`
    ALTER TABLE "ShopCatalogItems"
    ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await sequelize.query(`
    ALTER TABLE "ShopCatalogItems"
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
  `);

  await sequelize.query(`
    UPDATE "ShopCatalogItems"
    SET publish_status = 'published'
    WHERE publish_status IS NULL;
  `);
}
