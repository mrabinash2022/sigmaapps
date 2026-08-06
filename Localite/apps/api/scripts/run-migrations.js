import { loadEnv } from '../src/config/loadEnv.js';
import sequelize from '../src/database.js';
import { migrateSupportSchema } from '../src/services/supportSchemaMigration.js';
import { migrateUserProfileSchema } from '../src/services/userSchemaMigration.js';

loadEnv();

await sequelize.authenticate();
await migrateSupportSchema();
await migrateUserProfileSchema();
console.log('Migrations applied successfully');
process.exit(0);
