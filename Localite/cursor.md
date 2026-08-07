# Localite — Cursor Project Guide

> Keep this file updated as the app evolves. It is the primary context file for AI assistants working in this repo.

## What is Localite?

Localite is a **hyper-local, trust-based commerce** mobile app. It connects neighborhood shops with customers who already know them — not a warehouse/dark-store model.

| Dimension | Localite approach |
|-----------|-------------------|
| Relationship | Known customer ↔ known shop |
| Catalog | Visual catalog (flowers/nursery) or free-text / photo orders |
| Pricing | Shopkeeper confirms amount after accepting |
| Fulfillment | Shop staff delivers; partial fulfillment & backorders supported |
| Payment | Razorpay UPI or Cash on Delivery |

**Users:** Customer, Admin (shop owner), Super Admin.

**Repo:** Part of the [sigmaapps](https://github.com/mrabinash2022/sigmaapps) monorepo at `Localite/`.

---

## Technology stack

| Layer | Technology |
|-------|------------|
| **Mobile** | Expo SDK 54, React Native 0.81, React 19, React Navigation 7 |
| **API** | Node.js 18+, Express 4, ES modules |
| **Database** | PostgreSQL 16 (Docker), Sequelize ORM |
| **Auth** | bcrypt, JWT (access + refresh), OTP sessions |
| **Payments** | Razorpay (dev mock when keys unset) |
| **Push** | Expo Notifications + `expo-server-sdk` |
| **Storage** | Local disk (default) or Cloudinary |
| **Logging** | Winston (API) → `docs/logging/backend/`; mobile client ingest → `docs/logging/frontend/` |
| **Caching** | In-memory TTL on API (areas, shops, catalog) + mobile response cache in `api.js` |
| **Shared** | `@localite/shared` — enums, utils, log format, `createTtlCache` |
| **Monorepo** | npm workspaces (`apps/*`, `packages/*`) |

### Key mobile libraries

- `expo-secure-store` — token storage
- `expo-image-picker` — order photos
- `expo-speech-recognition` — voice order input (requires dev build, not Expo Go)
- `@react-navigation/bottom-tabs` / `native-stack`

### Key API libraries

- `helmet`, `cors`, `express-rate-limit` — security
- `multer` — uploads
- `winston`, `winston-daily-rotate-file` — structured logging

---

## Project structure

```text
Localite/
├── apps/
│   ├── api/                 # Express REST API (port 5000)
│   │   └── src/
│   │       ├── routes/      # HTTP route modules
│   │       ├── services/    # Business logic
│   │       ├── models/      # Sequelize models
│   │       ├── middleware/  # auth, errors, request logging
│   │       └── logging/     # Winston + client log writer
│   └── mobile/              # Expo app (Metro port 8081)
│       └── src/
│           ├── screens/     # Role-based screens
│           ├── components/
│           ├── services/    # api.js, speech, etc.
│           └── logging/     # Client logger → POST /api/logs/client
├── packages/
│   └── shared/              # Shared enums & utilities
├── docs/
│   ├── architecture.md      # Full system design (deep reference)
│   ├── logging/             # Runtime logs (gitignored except README)
│   └── apicurl/             # API curl examples
├── .cursor/
│   └── rules/               # AI rules: standards, review, git author
├── docker-compose.yml       # PostgreSQL
└── cursor.md                # This file
```

---

## Common commands

```bash
npm install
docker compose up -d          # PostgreSQL
npm run api:seed              # Seed demo data
npm run api                   # API on :5000
npm run mobile                # Expo on :8081
```

**Secrets:** Copy `apps/api/dev.local.example` → `apps/api/dev.local` (never commit).

---

## Demo accounts (after seed)

| Role | Phone / login | Password |
|------|---------------|----------|
| Super Admin | `9000000001` | `SuperAdmin@123` |
| Shop Admin | `9999999999` | `Admin@12345` |
| Customer | `8888888888` | `Customer@123` |
| OTP (dev) | any phone | `123456` |

---

## Conventions for contributors & AI

### Git

- **Author:** Always `Abinash <mrabinash2022@gmail.com>` (see `.cursor/rules/git-commit-author.mdc`)
- **Never commit:** `.env`, `dev.local`, `docs/logging/**/*.log`, uploads, secrets
- **Commit only when asked** — do not auto-commit

### Code style

- Minimize scope; match existing patterns in the file you edit
- Reuse `@localite/shared` for enums and cross-platform logic
- API: route → service → model; use `logger` not `console.log`
- Mobile: use `src/logging/logger.js` for errors; API calls via `src/services/api.js`

### Logging

- Backend: `import logger from './logging/logger.js'`
- Mobile: `import logger from '../logging/logger'`
- Log files land in `docs/logging/` — see `docs/logging/README.md`

### Caching

| Layer | File | TTL (defaults) |
|-------|------|----------------|
| Shared util | `packages/shared/src/cacheUtils.js` | `createTtlCache()` |
| API | `apps/api/src/services/cacheService.js` | Areas 10m, shops 2m, catalog 2m |
| Mobile | `apps/mobile/src/services/responseCache.js` | Areas 1h, shops/catalog 2–3m, orders 15–30s |

- Pull-to-refresh passes `{ force: true }` to bypass mobile cache
- Mutations invalidate related cache keys automatically
- Redis not required until multiple API instances

---

## Code review & best practices — where things live

Use a **layered** approach so humans, AI, and CI each have a clear home:

| Purpose | Location | When it runs |
|---------|----------|--------------|
| **AI coding standards** | `.cursor/rules/coding-standards.mdc` | Every Cursor session (always apply) |
| **AI review checklist** | `.cursor/rules/code-review.mdc` | Before commits / when user asks for review |
| **Git commit rules** | `.cursor/rules/git-commit-author.mdc` | On commit |
| **Deep architecture** | `docs/architecture.md` | Human reference; link from PRs |
| **Human review checklist** | `docs/code-review.md` *(add when team grows)* | PR template / manual review |
| **Automated CI** | `.github/workflows/` *(future)* | On push / PR — lint, test, typecheck |
| **PR template** | `.github/pull_request_template.md` *(future)* | Reminds reviewers what to check |
| **Cursor Bugbot / Security Review** | Ask in chat or use review skills | On demand before merge |

### Recommended workflow

1. **While coding** — Cursor reads `.cursor/rules/coding-standards.mdc`
2. **Before check-in** — Run through `.cursor/rules/code-review.mdc` (or ask: “review my changes”)
3. **On PR** — Human uses `docs/architecture.md` + future `docs/code-review.md`
4. **Later** — Add GitHub Actions for ESLint, tests, and `npm audit`

### Adding new review rules

- **Quick AI reminders** → edit `.cursor/rules/*.mdc`
- **Detailed rationale / examples** → add or extend `docs/code-review.md`
- **Enforced checks** → add scripts in `package.json` + `.github/workflows/`

---

## Documentation index

| Doc | Purpose |
|-----|---------|
| [README.md](./README.md) | Quick start & demo accounts |
| [cursor.md](./cursor.md) | This file — stack, conventions, AI context |
| [docs/architecture.md](./docs/architecture.md) | Full system design, flows, schema |
| [docs/logging/README.md](./docs/logging/README.md) | Logging setup & file layout |
| [.cursor/rules/](./.cursor/rules/) | Cursor AI rules (standards, review, git) |

---

## Changelog (high level)

| Date | Notes |
|------|-------|
| 2026-08-07 | In-memory TTL caching (API + mobile) for areas, shops, catalog, orders |
| 2026-08-07 | App-wide Winston logging, voice ordering, profile refer/about, logging gitignore |

*Update this table when shipping notable features.*
