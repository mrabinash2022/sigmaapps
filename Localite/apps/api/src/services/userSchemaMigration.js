import sequelize from '../database.js';

// Keep in sync with docs/app.sql (changelog v0.4)
export async function migrateUserProfileSchema() {
  await sequelize.query(`
    ALTER TABLE "Users"
    ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(512);
  `);
}
