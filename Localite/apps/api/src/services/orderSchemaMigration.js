import sequelize from '../database.js';

// Keep in sync with docs/app.sql (changelog v0.5–v0.6)
export async function migrateOrderSchema() {
  const enumValues = [
    { type: 'enum_Orders_order_status', value: 'Rejected' },
    { type: 'enum_Orders_order_status', value: 'Returned' },
    { type: 'enum_Orders_payment_status', value: 'Refund_Pending' },
    { type: 'enum_Orders_payment_status', value: 'Refunded' },
  ];

  for (const { type, value } of enumValues) {
    await sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = '${type}' AND e.enumlabel = '${value}'
        ) THEN
          ALTER TYPE "${type}" ADD VALUE '${value}';
        END IF;
      END $$;
    `);
  }

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS return_reason TEXT;
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(255);
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_Orders_order_status' AND e.enumlabel = 'Backorder_Waiting'
      ) THEN
        ALTER TYPE "enum_Orders_order_status" ADD VALUE 'Backorder_Waiting';
      END IF;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES "Orders"(id) ON DELETE SET NULL;
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS fulfillment_payload JSONB;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_Orders_order_status' AND e.enumlabel = 'Cancelled'
      ) THEN
        ALTER TYPE "enum_Orders_order_status" ADD VALUE 'Cancelled';
      END IF;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
  `);

  await sequelize.query(`
    ALTER TABLE "Orders"
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
  `);
}
