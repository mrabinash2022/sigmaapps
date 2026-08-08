# Localite API — cURL & Postman Reference

Base URL (local dev): `http://localhost:5000`

## Quick start

1. Start API: `npm run api` (from repo root)
2. Seed demo data (optional): `npm run api:seed`
3. Import into Postman:
   - Collection: `localite.postman_collection.json`
   - Environment: `localite.postman_environment.json`
4. Run **Auth → Login (Super Admin)** (or Customer / Shop Admin), then copy `accessToken` into the `accessToken` environment variable.

## Demo accounts (after seed)

| Role | Identifier | Password |
|------|------------|----------|
| Super Admin | `9000000001` or `superadmin` | `SuperAdmin@123` |
| Shop Admin | `9999999999` or `shopadmin` | `Admin@12345` |
| Customer | `8888888888` or `customer1` | `Customer@123` |
| OTP (dev) | any phone | `123456` |

## Shell variables (bash / Git Bash)

```bash
source docs/apicurl/env.example.sh
# Login and set token:
export ACCESS_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"9000000001","password":"SuperAdmin@123"}' | jq -r '.accessToken')
```

## PowerShell (Windows)

```powershell
$BASE_URL = "http://localhost:5000"
$res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login/password" -Method POST `
  -ContentType "application/json" `
  -Body '{"identifier":"9000000001","password":"SuperAdmin@123"}'
$ACCESS_TOKEN = $res.accessToken
```

## Auth header

Protected routes require:

```
Authorization: Bearer <accessToken>
```

## Files

| File | Description |
|------|-------------|
| [env.example.sh](env.example.sh) | Environment variables for scripts |
| [01-health-and-auth.md](01-health-and-auth.md) | Health, register, login, OTP, profile |
| [02-areas-and-shops.md](02-areas-and-shops.md) | Areas, shops, invitations |
| [03-orders.md](03-orders.md) | Order lifecycle |
| [04-admin.md](04-admin.md) | Super admin shop & user management |
| [05-support-and-webhooks.md](05-support-and-webhooks.md) | Support tickets, Razorpay webhook |
| [06-catalog-app-logs.md](06-catalog-app-logs.md) | Catalog CRUD, CSV import, app info, referrals, client logs |
| [07-home-reports-offers.md](07-home-reports-offers.md) | Home screens, favorites, reports, store info, offers, announcements |
| [08-addresses-wishlist-ratings.md](08-addresses-wishlist-ratings.md) | Saved addresses, wishlist, ratings, analytics |
| [09-bulk-buy.md](09-bulk-buy.md) | Bulk buy campaigns, subscriptions, store offers |
| [localite.postman_collection.json](localite.postman_collection.json) | Postman collection (import all endpoints) |
| [localite.postman_environment.json](localite.postman_environment.json) | Postman environment variables |

## Typical test flows

### Super Admin: create shop & approve

1. Login as super admin → set `ACCESS_TOKEN`
2. `GET /api/areas` → copy `areaId`
3. `POST /api/admin/shops/invite` with `shopCode`, `ownerPhone`, `areaId`
4. Shopkeeper completes registration via mobile or `POST /api/shops/:id/complete-registration`
5. `PATCH /api/admin/shops/:id/approve`
6. `PATCH /api/admin/shops/:id/operational-status` → `enabled`

### Customer: place catalog order

1. Login as customer
2. `GET /api/areas` → `GET /api/shops/area/:areaId` → copy `shopId`
3. `GET /api/shops/:shopId/catalog` → copy `catalogItemId` values
4. `POST /api/orders/submit-catalog-order` with `shopId` + `items[]`
5. Shop accepts → customer pays → ship → deliver

### Customer: place text order

1. Login as customer
2. `GET /api/areas` → `GET /api/shops/area/:areaId` → copy `shopId`
3. `POST /api/orders/submit-flexible-order` with `shopId` + `textPayload`
4. Wait for shop to accept → select payment → pay (mock) → deliver

### Bulk buy: group electronics deal

1. Super admin: `PATCH /api/admin/shops/:shopId` with `{ "bulkBuyEnabled": true }` for electronics partners
2. Customer: `POST /api/bulk-buy/campaigns` (or store creates with `shopId`)
3. Customers: `POST /api/bulk-buy/campaigns/:id/subscribe` until threshold (default 10)
4. Store inbox: `GET /api/bulk-buy/campaigns/inbox` → `POST .../offers` with discount and warranty
5. Subscribers: `GET /api/bulk-buy/campaigns/:id` to view store offers
