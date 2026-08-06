# Localite database reference

PostgreSQL schema and demo data scripts for the Localite API (`apps/api`).

## Files

| File | Purpose |
|------|---------|
| [`app.sql`](./app.sql) | Full schema reference — tables, enums, indexes, FKs, and changelog |
| [`seed-data.sql`](./seed-data.sql) | Demo / feeder data (areas, users, shops, links) |

## Source of truth

Runtime schema is defined by Sequelize models in `apps/api/src/models/` and applied on API startup via:

1. `sequelize.sync()` — creates missing tables
2. `migrateSupportSchema()` — support ticket columns
3. `migrateUserProfileSchema()` — profile picture column

**When you change a model or add a migration in code, update `docs/app.sql` and note it in the changelog section at the top of that file.**

## Applying schema manually

```bash
# Create database (if needed)
psql -U postgres -c "CREATE DATABASE localite_db;"

# Apply reference schema (fresh DB or review)
psql -U postgres -d localite_db -f docs/app.sql

# Load demo data (after schema exists)
psql -U postgres -d localite_db -f docs/seed-data.sql
```

## Recommended dev seed (Node — handles bcrypt + shop owners)

```bash
npm run api:seed
# or
node apps/api/scripts/sync-demo-data.js
```

The SQL seed file is for reference, manual restores, and environments where you want explicit INSERT statements. Password hashes are bcrypt (`bcryptjs`, 12 rounds).

## Connection defaults

| Setting | Default |
|---------|---------|
| Database | `localite_db` |
| User | `postgres` |
| Host | `localhost` |
| Port | `5432` |

See `apps/api/dev.local` for credentials.

## Demo logins (after seed)

| Role | Phone | Password |
|------|-------|----------|
| Customer | 8888888888 | Customer@123 |
| Shop Admin | 9999999999 | Admin@12345 |
| Super Admin | 9000000001 | SuperAdmin@123 |
| Seeded shop owners | 9876500001–9876500010 | Admin@12345 |
| Dev OTP | — | 123456 |
