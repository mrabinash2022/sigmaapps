import sequelize from '../database.js';

// Keep in sync with docs/app.sql (changelog v0.3)
export async function migrateSupportSchema() {
  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_SupportTickets_raised_by_role" AS ENUM ('customer', 'admin', 'super_admin');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE "SupportTickets"
    ADD COLUMN IF NOT EXISTS raised_by_id UUID REFERENCES "Users"(id) ON DELETE SET NULL;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE "SupportTickets" ADD COLUMN raised_by_role "enum_SupportTickets_raised_by_role";
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    UPDATE "SupportTickets"
    SET raised_by_id = "customerId",
        raised_by_role = 'customer'
    WHERE raised_by_id IS NULL AND "customerId" IS NOT NULL;
  `);
}
