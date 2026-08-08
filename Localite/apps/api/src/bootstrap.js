import sequelize from './database.js';
import './models/index.js';
import { Shop, User } from './models/index.js';
import { ShopOperationalStatus, ShopStatus, UserAccountStatus } from '@localite/shared';
import logger from './logging/logger.js';
import { migrateShopCodes } from './services/shopService.js';
import { migrateCatalogSchema } from './services/catalogSchemaMigration.js';
import { migrateOrderSchema } from './services/orderSchemaMigration.js';
import { migrateSupportSchema } from './services/supportSchemaMigration.js';
import { migrateUserProfileSchema } from './services/userSchemaMigration.js';
import { migrateHomeSchema } from './services/homeSchemaMigration.js';
import { migrateFeaturesSchema } from './services/featuresSchemaMigration.js';
import { migrateExtrasSchema } from './services/extrasSchemaMigration.js';

export async function bootstrapDatabase() {
  await sequelize.authenticate();
  logger.info('Database connected');

  try {
    await sequelize.query('UPDATE "OtpSessions" SET target = phone WHERE target IS NULL AND phone IS NOT NULL');
    await sequelize.query("UPDATE \"OtpSessions\" SET channel = 'sms' WHERE channel IS NULL");
    await sequelize.query('DELETE FROM "OtpSessions" WHERE target IS NULL');
  } catch {
    // OtpSessions table may not exist yet on first boot.
  }

  try {
    await sequelize.sync();
    logger.info('Database synced');
  } catch (syncErr) {
    logger.warn('Database sync skipped', { error: syncErr.message });
  }

  try {
    await migrateSupportSchema();
    await migrateUserProfileSchema();
    await migrateOrderSchema();
    await migrateCatalogSchema();
    await migrateHomeSchema();
    await migrateFeaturesSchema();
    await migrateExtrasSchema();
    logger.info('Schema migrations applied');
  } catch (migErr) {
    logger.warn('Schema migration warning', { error: migErr.message });
  }

  await Shop.update(
    { operationalStatus: ShopOperationalStatus.ENABLED },
    { where: { status: ShopStatus.APPROVED, operationalStatus: ShopOperationalStatus.DISABLED } },
  );

  const migrated = await migrateShopCodes(Shop);
  if (migrated > 0) {
    logger.info('Shop codes migrated', { count: migrated });
  }

  await User.update(
    { accountStatus: UserAccountStatus.ENABLED },
    { where: { isActive: true } },
  );
  await User.update(
    { accountStatus: UserAccountStatus.DISABLED },
    { where: { isActive: false } },
  );
}
