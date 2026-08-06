# Localite — Agent Context Scratchpad

> **Purpose:** Load this file at the start of a new Cursor session to restore project context without re-explaining prior work.
>
> **Last updated:** 2026-08-07  
> **Repo:** `c:\Users\Admin\Projects\sigmaapps\Localite` (monorepo: Expo mobile + Node/Express API + PostgreSQL/Sequelize)

---

## Project overview

Hyper-local commerce platform:

| Layer | Stack |
|-------|-------|
| Mobile | Expo / React Native (`apps/mobile`) |
| API | Node.js / Express (`apps/api`) |
| DB | PostgreSQL + Sequelize |
| Shared | `packages/shared` — enums, catalog utils, fulfillment utils |

**User:** Abinash (software engineer). Prefers working directly in code. Do not git commit unless explicitly asked.

---

## Dev accounts & commands

### Demo logins

| Role | Phone | Password |
|------|-------|----------|
| Customer | `8888888888` | `Customer@123` |
| Flowers shopkeeper | `9876500011` | `Admin@12345` |
| Nursery shopkeeper | `9876500012` | `Admin@12345` |
| Demo shopkeeper | `9999999999` | `Admin@12345` |

### Common commands

```bash
node apps/api/scripts/run-migrations.js
npm run api:seed
npm run api          # http://localhost:5000
npm run mobile       # Expo
```

API env: `apps/api/dev.local`

---

## Features completed (chronological)

### 1. Auth rate limiting
- Scoped `authLimiter` to login/register/OTP only; dev limits increased.
- Files: `apps/api/src/middleware/rateLimiter.js`, `authRoutes.js`, `dev.local`

### 2. Order rejection, shopkeeper queue, returns/refunds
- `Rejected` status, reject API, shop order queue UI, `Returned` + refund flow.
- Key: `orderRoutes.js`, `ManageOrderScreen.js`, `ShopInboxScreen.js`, `orderSchemaMigration.js`

### 3. Visual catalog stores (Flowers & Nursery)
- `ShopCatalogItem` model, `GET /api/shops/:shopId/catalog`, hybrid submit with catalog + text + photo.
- Generic via `visual_catalogEnabled` on `Shop` and `isVisualCatalogShop()` / `shopHasVisualCatalog()`.
- Shared: `packages/shared/src/catalogUtils.js`
- Mobile: `CatalogOrderScreen.js`, `VisualProductCatalog.js`, `OrderExtrasPanel.js`
- Seed: `apps/api/src/seeders/catalogSeed.js` — Pooja & Flowers (14 items), Green Roots Nursery (17), plus Sweets/Bakery/Grocery extensions

### 4. Unified order items list
- `catalog_payload` stores `items`, `textLines`, `imageUrl`, `note` together.
- `getOrderItemsList()`, `formatOrderItemsSummary()` in `catalogUtils.js`
- `CatalogOrderItems.js` shows one combined “Order items” section

### 5. Shopkeeper product management
- Draft/publish workflow on `ShopCatalogItem.publishStatus` (`draft` | `published`)
- API: `catalogManageRoutes.js` — CRUD, publish/unpublish, image upload
- Mobile: `ManageCatalogScreen.js`, `EditCatalogItemScreen.js`, **Products** tab in `AdminStack`
- Customers only see **published** items

### 6. Customer reorder
- `POST /api/orders/reorder/:orderId` — copies delivered order items (catalog, text, photo)
- `canReorderOrder()` — only `Delivered` orders
- Mobile: `ReorderConfirmScreen.js`, Reorder buttons on `MyOrdersScreen` and `OrderDetailScreen`
- Service: `apps/api/src/services/orderReorderService.js`

### 7. Partial fulfillment & backorders ✅ (completed)
When shopkeeper accepts an order but some items are unavailable:

1. Shopkeeper marks which items are missing/unavailable (or partial qty).
2. Bill amount reflects only available items; customer is informed.
3. Missing items can spawn an automatic **backorder** child order.
4. When items become available, shopkeeper activates backorder → customer notified → normal delivery flow.

---

## Partial fulfillment — design & implementation

### Data model

| Field | Table | Purpose |
|-------|-------|---------|
| `fulfillment_payload` (JSONB) | `Orders` | Line-level fulfillment on parent order |
| `parent_order_id` (UUID FK) | `Orders` | Links backorder child → original order |
| `Backorder_Waiting` | `order_status` enum | Child order waiting for stock |

**Parent order** `fulfillment_payload` contains:
- `lines` — per-item status (`fulfilled` / `partial` / `unavailable`)
- `unavailableSummary` — human-readable missing items
- `shopNote`, `finalBillAmount`, `backorderOrderId` (if created)

**Child backorder order:**
- `parentOrderId` set, `orderStatus: Backorder_Waiting`
- `catalog_payload` with only unavailable/missing items
- On accept with `createBackorder: true`, auto-created

### API endpoints

| Method | Endpoint | Body / notes |
|--------|----------|--------------|
| `PATCH` | `/api/orders/transition/accept/:orderId` | `{ finalBillAmount, deliveryTimeWindow, fulfillment: { lines, shopNote }, createBackorder }` |
| `PATCH` | `/api/orders/transition/backorder-ready/:orderId` | `{ finalBillAmount, deliveryTimeWindow }` — `Backorder_Waiting` → `Accepted` |

### Shared utilities (`packages/shared/src/fulfillmentUtils.js`)

- `buildFulfillmentLinesFromOrder()` — editable lines for shopkeeper
- `normalizeFulfillmentInput()`, `buildFulfillmentPayload()`
- `FulfillmentLineStatus`: `fulfilled` | `unavailable` | `partial`
- `getUnavailableLines()`, `computeCatalogFulfillmentTotal()`
- `parseFulfillmentPayload()`, `hasUnavailableItems()`, `formatFulfillmentSummary()`
- `isBackorderWaiting()`

### Enums (`packages/shared/src/enums.js`)

- `OrderStatus.BACKORDER_WAITING = 'Backorder_Waiting'`
- Transitions: `Backorder_Waiting → Accepted | Rejected`

### API services & routes

- `apps/api/src/services/orderFulfillmentService.js` — `acceptOrderWithFulfillment()`, `activateBackorderOrder()`
- `apps/api/src/services/orderService.js` — includes `backorderOrders` / `parentOrder` in `getOrderWithDetails()`
- `apps/api/src/services/notificationService.js` — `PartialAccepted`, `BackorderCreated`, `BackorderReady` push events
- `apps/api/src/services/orderSchemaMigration.js` — migration for enum + columns
- `apps/api/src/models/Order.js` — `parentOrderId`, `fulfillmentPayload`
- `apps/api/src/models/index.js` — `Order` self-refs: `parentOrder`, `backorderOrders`

### Mobile — shopkeeper

- `OrderFulfillmentPanel.js` — mark items unavailable/partial, shop note, backorder toggle
- `ManageOrderScreen.js` — accept with fulfillment; backorder activation section
- `ShopInboxScreen.js` + `orderQueue.js` — **Backorder — waiting for stock** queue section

### Mobile — customer

- `FulfillmentSummary.js` — unavailable items, shop note, backorder link/status on order detail
- `OrderDetailScreen.js` — backorder waiting banner; payment flow when activated

### Mobile API client

- `api.acceptOrder(orderId, amount, window, fulfillment, createBackorder)`
- `api.markBackorderReady(orderId, amount, window)`

### Validation rules

- At least one item must be fulfilled to accept (reject entirely if nothing available).
- If unavailable items exist: shop note or per-line reason required.
- `createBackorder` only applies when there are unavailable lines.

### Test flow

1. Customer places catalog order.
2. Shopkeeper marks item unavailable, adjusts amount, accepts with backorder on.
3. Customer sees fulfillment summary + revised bill; gets push notification.
4. Backorder appears in shop queue (`Backorder_Waiting`).
5. Shopkeeper activates when stock arrives → customer pays → normal ship/deliver.

---

## Key file paths (quick reference)

| Area | Paths |
|------|-------|
| Shared | `packages/shared/src/enums.js`, `catalogUtils.js`, `fulfillmentUtils.js` |
| API orders | `apps/api/src/routes/orderRoutes.js`, `services/orderReorderService.js`, `services/orderFulfillmentService.js` |
| API catalog | `services/catalogService.js`, `routes/catalogManageRoutes.js` |
| API models | `apps/api/src/models/Order.js`, `ShopCatalogItem.js`, `models/index.js` |
| Migrations | `orderSchemaMigration.js`, `catalogSchemaMigration.js`, `scripts/run-migrations.js` |
| Mobile customer | `CatalogOrderScreen.js`, `ReorderConfirmScreen.js`, `MyOrdersScreen.js`, `OrderDetailScreen.js` |
| Mobile shopkeeper | `ManageCatalogScreen.js`, `EditCatalogItemScreen.js`, `ManageOrderScreen.js`, `ShopInboxScreen.js` |
| Mobile components | `OrderFulfillmentPanel.js`, `FulfillmentSummary.js`, `CatalogOrderItems.js` |
| Seed | `apps/api/src/seeders/catalogSeed.js` |
| Docs | `docs/architecture.md`, `docs/app.sql`, `docs/scratchpad.md` (this file) |

---

## Order status machine (current)

```
Created → Accepted | Rejected
Accepted → Shipped
Shipped → Delivered | Returned
Delivered → Returned
Backorder_Waiting → Accepted | Rejected
Rejected / Returned → (terminal)
```

Payment: UPI requires `Paid` before ship; COD uses `Not_Required`.

---

## Schema changelog (recent)

| Version | Changes |
|---------|---------|
| v0.7 | `Backorder_Waiting` status; `parent_order_id`, `fulfillment_payload` on Orders |
| v0.6 | `Returned` status; `Refund_Pending`/`Refunded`; return/refund columns |
| v0.5 | `Rejected` status; `rejection_reason` |
| Earlier | Catalog, visual catalog, profile pictures, support tickets |

---

## Possible follow-ups (not done unless requested)

- Reject flow on `Backorder_Waiting` orders in shopkeeper UI
- Auto-calculate bill from fulfilled catalog lines only (excluding manual text/photo)
- Postman collection updates for fulfillment accept + backorder-ready endpoints
- Git commit / PR when user asks

---

## How to use this scratchpad in Cursor

At the start of a new chat, prompt:

> Read `docs/scratchpad.md` and continue from there.

Or add a Cursor rule referencing this file for persistent context.
