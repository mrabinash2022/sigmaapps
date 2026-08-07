# Localite end-to-end mobile smoke tests (Maestro)

YAML flows that exercise the Expo app against a running API + Metro bundler.

## Prerequisites

1. **Postgres** — `npm run db:up` from repo root
2. **Seed data** — `npm run api:seed`
3. **API** — `npm run api` (port 5000)
4. **Metro** — `npm run mobile` (port 8081)
5. **Maestro** — [Install Maestro](https://maestro.mobile.dev/docs/getting-started/installing-maestro)
6. **Android emulator** or physical device with **Expo Go**

## Configure API URL

The mobile app reads `EXPO_PUBLIC_API_URL` at build time via `app.config.js`.

| Environment | URL |
|-------------|-----|
| Android emulator | `http://10.0.2.2:5000` |
| iOS simulator | `http://localhost:5000` |
| Physical device | Your machine LAN IP, e.g. `http://192.168.1.10:5000` |

```powershell
# PowerShell — start Metro with emulator API URL
$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:5000"
npm run mobile
```

```bash
# Bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000 npm run mobile
```

Open the project in **Expo Go** on the emulator (scan QR or press `a` in Metro).

## Run flows

From repo root:

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

## Flows

| Flow | Description |
|------|-------------|
| `01-browse-shops` | Customer login → Stores tab → shop list |
| `02-place-text-order` | Place a text order at first grocery shop |
| `03-shopkeeper-inbox` | Shop admin login → order queue |
| `04-customer-orders-tab` | Customer Orders tab loads |
| `smoke-suite` | Runs browse + order + orders tab |

## testIDs

Key screens expose `testID` props for stable selectors:

- `login-identifier`, `login-password`, `login-submit`
- `tab-stores`, `tab-orders`
- `shop-list`, `shop-card`
- `order-text-input`, `place-order-submit`
- `my-orders-screen`, `shop-inbox`

## CI

- **PR** — API tests run via `.github/workflows/api-test.yml`
- **Merge / nightly** — Mobile smoke via `.github/workflows/mobile-smoke.yml` (Android emulator + Expo Go)

Manual CI trigger: GitHub Actions → Mobile Smoke Tests → Run workflow.
