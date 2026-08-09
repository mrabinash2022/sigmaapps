# Localite testing guide

Automated tests live in the monorepo as dev-only workspaces. They do **not** ship in production mobile or API builds.

## Quick reference

| What | Command (from `Localite/` root) |
|------|----------------------------------|
| API tests (local) | `npm run test:api` |
| API tests (CI mode) | `npm run test:api:ci` |
| Mobile smoke (Maestro) | See [Mobile smoke tests](#mobile-smoke-tests-maestro) |

---

## Before you run anything

### 1. Install dependencies

```bash
cd Localite
npm install
```

### 2. Configure API environment

Tests reuse your **Postgres connection settings** from `apps/api/dev.local` (and optional `apps/api/.env`).

```bash
cp apps/api/.env.example apps/api/.env          # optional non-secret defaults
cp apps/api/dev.local.example apps/api/dev.local  # required — DB password, JWT secrets
```

Edit `apps/api/dev.local` with your real `DB_PASSWORD` and other secrets. **Never commit `dev.local`.**

### 3. Start PostgreSQL

Use **either** Docker **or** a local Postgres install on port `5432`:

```bash
# Option A — Docker (recommended)
npm run db:up
```

```powershell
# Option B — existing local Postgres
# Ensure DB_HOST, DB_USER, DB_PASSWORD in dev.local match your install
```

If Docker Desktop is not running, API tests still work as long as Postgres is reachable with the credentials in `dev.local`.

### 4. Test database

On first run, the test suite **automatically creates** a separate database:

- **Name:** `localite_test_db` (does not touch your dev `localite_db`)
- **Seed:** Demo users, shops, and catalog data are loaded before tests run

No manual `CREATE DATABASE` is required.

---

## API integration tests (Jest + Supertest)

**Location:** `apps/api/tests/`  
**CI:** `.github/workflows/api-test.yml` on every PR and push to `main`

### Run locally

```bash
npm run test:api
```

CI mode (single worker, no watch — same as GitHub Actions):

```bash
npm run test:api:ci
```

### PowerShell (Windows)

```powershell
cd c:\Users\Admin\Projects\sigmaapps\Localite
npm run test:api:ci
```

### What happens on `npm run test:api:ci`

1. Loads `apps/api/dev.local` for `DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc.
2. Creates `localite_test_db` if it does not exist
3. Seeds demo data (`apps/api/src/seeders/seed.js`)
4. Seeds demo data (`apps/api/src/seeders/seed.js`)
5. Runs all Jest suites in `apps/api/tests/` (~80 tests, ~60–120 seconds)

### Expected output

```
Test Suites: 12 passed, 12 total
Tests:       80+ passed
```

(Run `npm run test:api:ci` locally for the exact count.)

### Test suites

| File | Coverage |
|------|----------|
| `health.test.js` | `GET /api/health` |
| `auth.test.js` | Login, OTP, `/me`, `bulkBuyEnabled` on shop admin |
| `areas-shops.test.js` | Areas, shops, catalog |
| `orders.test.js` | Place → accept → COD → ship → deliver → reorder, reject |
| `admin.test.js` | Super admin shops/users, `bulkBuyEnabled`, bulk buy settings |
| `support.test.js` | Tickets, messages |
| `app-logs.test.js` | App info, client logs, referrals |
| `bulkBuy.test.js` | **v0.12** campaigns, offers, accept, token, poll, close, settings |
| `catalog-stock.test.js` | Catalog stock tracking |
| `extras.test.js` | Scheduled orders, wishlist, ratings |
| `home.test.js` | Home screens, favorites |
| `reports.test.js` | PDF/Excel reports |

### Test-only environment

These are set automatically by the test runner; override only if needed:

| Variable | Test value |
|----------|------------|
| `NODE_ENV` | `test` |
| `DB_NAME` | `localite_test_db` |
| `DISABLE_AUTH_RATE_LIMIT` | `true` |
| `DEV_OTP` | `123456` |
| `JWT_SECRET` | `test-jwt-secret-localite` (if not in `dev.local`) |

See `apps/api/tests/test.env.example` for a full list.

### Troubleshooting API tests

| Error | Fix |
|-------|-----|
| `password authentication failed for user "postgres"` | Set correct `DB_PASSWORD` in `apps/api/dev.local` |
| `connect ECONNREFUSED` | Start Postgres (`npm run db:up`) or check `DB_HOST` / `DB_PORT` |
| `Test database seed failed` | Ensure the Postgres user can `CREATE DATABASE` |
| Tests pass locally but fail in CI | CI uses `postgres` / `postgres` on port 5432 — no `dev.local` in GitHub |

### Adding API tests

1. Create `apps/api/tests/my-feature.test.js`
2. Import helpers from `tests/helpers.js` (`login`, `api`, `authHeader`, `DEMO`)
3. Run `npm run test:api`

---

## Mobile smoke tests (Maestro)

**Location:** `apps/e2e-mobile/flows/`  
**CI:** `.github/workflows/mobile-smoke.yml` on merge to `main`, nightly, and manual dispatch

Full Maestro setup: [apps/e2e-mobile/README.md](../../apps/e2e-mobile/README.md)

### Prerequisites

1. Postgres + seed: `npm run db:up` then `npm run api:seed`
2. [Maestro CLI](https://maestro.mobile.dev/docs/getting-started/installing-maestro) installed
3. Android emulator or device with **Expo Go**
4. API and Metro running in separate terminals

### Run locally

**Terminal 1 — API**

```bash
npm run api
```

**Terminal 2 — Metro** (set API URL for emulator)

```bash
# Bash / Git Bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000 npm run mobile
```

```powershell
# PowerShell
$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:5000"
npm run mobile
```

Open the app in **Expo Go** on the emulator (press `a` in Metro or scan QR).

**Terminal 3 — Maestro**

```bash
maestro test apps/e2e-mobile/flows --config apps/e2e-mobile/config.yaml
```

Single flow:

```bash
maestro test apps/e2e-mobile/flows/01-browse-shops.yaml --config apps/e2e-mobile/config.yaml
```

Full smoke suite:

```bash
maestro test apps/e2e-mobile/flows/smoke-suite.yaml --config apps/e2e-mobile/config.yaml
```

### API URL by device

| Device | `EXPO_PUBLIC_API_URL` |
|--------|------------------------|
| Android emulator | `http://10.0.2.2:5000` |
| iOS simulator | `http://localhost:5000` |
| Physical phone | Your PC LAN IP, e.g. `http://192.168.1.10:5000` |

### Smoke flows

| Flow | What it checks |
|------|----------------|
| `01-browse-shops` | Customer login → Stores tab → shop list |
| `02-place-text-order` | Text order at LifeCare Pharmacy |
| `03-shopkeeper-inbox` | Shop admin login → order queue |
| `04-customer-orders-tab` | Customer Orders tab |
| `smoke-suite` | Runs browse + order + orders tab |

### testIDs used by Maestro

`login-identifier`, `login-password`, `login-submit`, `tab-stores`, `tab-orders`, `shop-list`, `shop-card`, `order-text-input`, `place-order-submit`, `my-orders-screen`, `shop-inbox`

---

## CI workflows (GitHub Actions)

Tests run **automatically** on GitHub when you push or open a PR that touches `Localite/**`.

| Workflow | Trigger | What runs |
|----------|---------|-----------|
| [`api-test.yml`](../../.github/workflows/api-test.yml) | **Every push** (any branch) + **every PR** + manual | `npm run test:api:ci` — all API test suites |
| [`mobile-smoke.yml`](../../.github/workflows/mobile-smoke.yml) | Push to `main`, nightly, manual | Maestro on Android emulator |

### What happens on push / PR

1. GitHub starts a Postgres 16 service container
2. Checks out the repo and runs `npm ci` in `Localite/`
3. Creates `localite_test_db`, seeds demo data, runs all Jest suites
4. PR shows pass/fail on the **API Tests** check

No `dev.local` is needed in CI — credentials are set in the workflow file.

### Run the same check locally before pushing

```bash
npm run test:api:ci
```

### Manual run on GitHub

**Actions** → **API Tests** → **Run workflow**

### Optional: require tests before merge

In GitHub repo **Settings** → **Branches** → branch protection for `main`:

- Enable **Require status checks to pass**
- Select **Jest + Supertest** status check (or the workflow name used in your repo)

Repo path in workflows is `Localite/` (monorepo root is `sigmaapps`).

---

## Architecture notes

- `apps/api/src/app.js` — `createApp()` for Supertest (no HTTP server in tests)
- `apps/api/src/bootstrap.js` — DB sync + migrations (shared by server and tests)
- `apps/api/tests/globalSetup.js` — creates `localite_test_db`, seeds data, loads `dev.local`
- `apps/mobile/app.config.js` — reads `EXPO_PUBLIC_API_URL` for emulator/device targeting

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [docs/apicurl/README.md](../apicurl/README.md) | Manual API testing with cURL / Postman |
| [docs/apicurl/09-bulk-buy.md](../apicurl/09-bulk-buy.md) | Bulk buy v0.12 cURL reference |
| [docs/bulk-buy-architecture.md](../bulk-buy-architecture.md) | Bulk buy architecture |
| [apps/e2e-mobile/README.md](../../apps/e2e-mobile/README.md) | Maestro flows in detail |
| [docs/code-review.md](../code-review.md) | PR review checklist |
