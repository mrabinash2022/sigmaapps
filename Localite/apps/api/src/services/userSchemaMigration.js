import sequelize from '../database.js';

// Keep in sync with docs/app.sql (changelog v0.4)
export async function migrateUserProfileSchema() {
  await sequelize.query(`
    ALTER TABLE "Users"
    ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(512);
  `);

  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_OtpSessions_purpose' AND e.enumlabel = 'password_reset'
      ) THEN
        ALTER TYPE "enum_OtpSessions_purpose" ADD VALUE 'password_reset';
      END IF;
    END $$;
  `);
}
