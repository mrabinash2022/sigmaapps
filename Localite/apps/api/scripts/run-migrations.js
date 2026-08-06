import { loadEnv } from '../src/config/loadEnv.js';
import sequelize from '../src/database.js';
import { migrateCatalogSchema } from '../src/services/catalogSchemaMigration.js';
import { migrateOrderSchema } from '../src/services/orderSchemaMigration.js';
import { migrateSupportSchema } from '../src/services/supportSchemaMigration.js';
import { migrateUserProfileSchema } from '../src/services/userSchemaMigration.js';

loadEnv();

await sequelize.authenticate();
await migrateSupportSchema();
await migrateUserProfileSchema();
await migrateOrderSchema();
await migrateCatalogSchema();
console.log('Migrations applied successfully');
process.exit(0);
