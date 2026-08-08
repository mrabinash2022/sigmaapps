import sequelize from '../database.js';

// v0.10 — scheduled orders, ratings, wishlist
export async function migrateExtrasSchema() {
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
  `);
  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS scheduled_window VARCHAR(255);
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "OrderRatings" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL UNIQUE REFERENCES "Orders"(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      shop_id UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_order_ratings_shop_id ON "OrderRatings"(shop_id);
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "CustomerWishlistItems" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      shop_id UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
      catalog_item_id UUID NOT NULL REFERENCES "ShopCatalogItems"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, catalog_item_id)
    );
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON "CustomerWishlistItems"(user_id);
  `);
}
