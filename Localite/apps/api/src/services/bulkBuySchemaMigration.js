import sequelize from '../database.js';

// v0.11 — bulk buy campaigns, participants, store offers
export async function migrateBulkBuySchema() {
  await sequelize.query(`
    ALTER TABLE "Shops"
    ADD COLUMN IF NOT EXISTS bulk_buy_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_bulk_buy_creator_type AS ENUM ('customer', 'store');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_bulk_buy_campaign_status AS ENUM (
        'collecting', 'ready_for_offers', 'offers_available', 'closed', 'expired', 'cancelled'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_bulk_buy_product_category AS ENUM (
        'refrigerator', 'washing_machine', 'television', 'mobile', 'air_conditioner', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_bulk_buy_participant_status AS ENUM ('subscribed', 'withdrawn');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "BulkBuyCampaigns" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      area_id UUID NOT NULL REFERENCES "Areas"(id) ON DELETE CASCADE,
      created_by_type enum_bulk_buy_creator_type NOT NULL,
      created_by_customer_id UUID REFERENCES "Users"(id) ON DELETE SET NULL,
      created_by_shop_id UUID REFERENCES "Shops"(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      product_category enum_bulk_buy_product_category NOT NULL,
      description TEXT,
      brand_preference VARCHAR(255),
      min_subscribers INTEGER NOT NULL DEFAULT 10 CHECK (min_subscribers >= 2),
      status enum_bulk_buy_campaign_status NOT NULL DEFAULT 'collecting',
      deadline_at TIMESTAMPTZ,
      threshold_reached_at TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_bulk_buy_campaigns_area_status
    ON "BulkBuyCampaigns"(area_id, status);
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "BulkBuyParticipants" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES "BulkBuyCampaigns"(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      status enum_bulk_buy_participant_status NOT NULL DEFAULT 'subscribed',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(campaign_id, customer_id)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_bulk_buy_participants_campaign
    ON "BulkBuyParticipants"(campaign_id) WHERE status = 'subscribed';
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "BulkBuyStoreOffers" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES "BulkBuyCampaigns"(id) ON DELETE CASCADE,
      shop_id UUID NOT NULL REFERENCES "Shops"(id) ON DELETE CASCADE,
      discount_type VARCHAR(32) NOT NULL DEFAULT 'percent',
      discount_value DECIMAL(12, 2),
      extras JSONB NOT NULL DEFAULT '{}',
      terms_text TEXT,
      valid_until TIMESTAMPTZ,
      submitted_by_user_id UUID REFERENCES "Users"(id) ON DELETE SET NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(campaign_id, shop_id)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_bulk_buy_offers_campaign
    ON "BulkBuyStoreOffers"(campaign_id);
  `);
}
