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

  await migrateBulkBuyV012Schema();
}

export async function migrateBulkBuyV012Schema() {
  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_bulk_buy_commitment_status AS ENUM (
        'accepted', 'token_pending', 'token_paid', 'visit_scheduled', 'completed', 'withdrawn'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_bulk_buy_token_payment_status AS ENUM (
        'not_required', 'pending', 'paid', 'failed', 'refunded'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE "BulkBuyCampaigns"
    ADD COLUMN IF NOT EXISTS visit_poll_dates JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_by_user_id UUID REFERENCES "Users"(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS close_reason VARCHAR(64);
  `);

  await sequelize.query(`
    ALTER TABLE "BulkBuyStoreOffers"
    ADD COLUMN IF NOT EXISTS token_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS proposed_deal_day DATE,
    ADD COLUMN IF NOT EXISTS confirmed_deal_day DATE;
  `);

  await sequelize.query(`
    ALTER TABLE "BulkBuyParticipants"
    ADD COLUMN IF NOT EXISTS accepted_offer_id UUID REFERENCES "BulkBuyStoreOffers"(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS commitment_status enum_bulk_buy_commitment_status,
    ADD COLUMN IF NOT EXISTS token_amount DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS token_payment_status enum_bulk_buy_token_payment_status,
    ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS poll_vote_date DATE,
    ADD COLUMN IF NOT EXISTS scheduled_visit_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS token_paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "BulkBuyPlatformSettings" (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      collection_period_days INTEGER NOT NULL DEFAULT 7 CHECK (collection_period_days >= 1),
      default_min_subscribers INTEGER NOT NULL DEFAULT 10 CHECK (default_min_subscribers >= 2),
      auto_close_grace_days_after_deal_day INTEGER NOT NULL DEFAULT 3 CHECK (auto_close_grace_days_after_deal_day >= 0),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    INSERT INTO "BulkBuyPlatformSettings" (
      id,
      collection_period_days,
      default_min_subscribers,
      auto_close_grace_days_after_deal_day,
      "createdAt",
      "updatedAt"
    )
    VALUES (1, 7, 10, 3, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_bulk_buy_participants_offer
    ON "BulkBuyParticipants"(accepted_offer_id)
    WHERE accepted_offer_id IS NOT NULL;
  `);

  await migrateBulkBuyTokenConfirmationSchema();
}

export async function migrateBulkBuyTokenConfirmationSchema() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TYPE enum_bulk_buy_commitment_status ADD VALUE 'token_payment_submitted';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TYPE enum_bulk_buy_token_payment_status ADD VALUE 'submitted';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE "BulkBuyParticipants"
    ADD COLUMN IF NOT EXISTS token_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS token_confirmed_by_user_id UUID REFERENCES "Users"(id) ON DELETE SET NULL;
  `);
}
