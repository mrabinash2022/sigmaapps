import { loadEnv } from '../src/config/loadEnv.js';
import sequelize from '../src/database.js';
import { migrateSupportSchema } from '../src/services/supportSchemaMigration.js';
import { migrateUserProfileSchema } from '../src/services/userSchemaMigration.js';
import { migrateOrderSchema } from '../src/services/orderSchemaMigration.js';
import { migrateCatalogSchema } from '../src/services/catalogSchemaMigration.js';
import { migrateHomeSchema } from '../src/services/homeSchemaMigration.js';

loadEnv();

const MIGRATIONS = [
  ['support', migrateSupportSchema],
  ['user profile', migrateUserProfileSchema],
  ['orders', migrateOrderSchema],
  ['catalog', migrateCatalogSchema],
  ['home (offers, store info, favorites)', migrateHomeSchema],
];

await sequelize.authenticate();

for (const [name, migrate] of MIGRATIONS) {
  await migrate();
  console.log(`Applied: ${name}`);
}

console.log('All migrations applied successfully');
await sequelize.close();
process.exit(0);
