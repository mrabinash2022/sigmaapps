# Localite — System Architecture

> Hyper-local trust-based commerce platform connecting neighborhood shops with their long-standing customers.

**Stack:** Expo React Native (mobile) · Node.js / Express (API) · PostgreSQL · Sequelize ORM  
**Pattern:** npm workspaces monorepo (`apps/api`, `apps/mobile`, `packages/shared`)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Authentication & Security](#4-authentication--security)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [Functional Modules](#6-functional-modules)
7. [Database Schema](#7-database-schema)
8. [Order Lifecycle](#8-order-lifecycle)
9. [Payment Flow](#9-payment-flow)
10. [Onboarding Flows](#10-onboarding-flows)
11. [Notifications](#11-notifications)
12. [File Storage](#12-file-storage)
13. [API Reference Map](#13-api-reference-map)
14. [Mobile App Navigation](#14-mobile-app-navigation)
15. [External Integrations](#15-external-integrations)
16. [Secrets & Configuration Management](#16-secrets--configuration-management)

---

## 1. System Overview

Localite is **not** a warehouse marketplace (Blinkit/Instamart model). It is a **trust bridge** between established neighborhood shops and their regular customers.

| Dimension | Warehouse Model | Localite Model |
|-----------|----------------|----------------|
| Inventory | Central warehouse | Shopkeeper sources locally |
| Delivery | Own fleet / couriers | Shop's own staff |
| Catalog (MVP) | Full product listing | Free-text list or photo of handwritten note |
| Pricing | Fixed at checkout | Shopkeeper confirms amount after accepting order |
| Payment | Prepaid dominant | UPI (Razorpay) or Cash on Delivery |
| Relationship | Anonymous | Known customer ↔ known shop |

```mermaid
flowchart LR
    subgraph Users
        C[Customer]
        A[Admin / Shop Owner]
        SA[Super Admin]
    end

    subgraph Platform
        M[Mobile App\nExpo RN]
        API[REST API\nExpress]
        DB[(PostgreSQL)]
    end

    subgraph External
        RZP[Razorpay]
        PUSH[Expo Push]
        SMS[SMS Provider\nfuture]
        CDN[Cloudinary\noptional]
    end

    C --> M
    A --> M
    SA --> M
    M <-->|HTTPS + JWT| API
    API <--> DB
    API --> RZP
    API --> PUSH
    API -.-> SMS
    API -.-> CDN
```

---

## 2. High-Level Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        MA[Mobile App\nReact Native / Expo]
        MA --> NAV[Role-Based Navigation]
        NAV --> CS[Customer Screens]
        NAV --> AS[Admin Screens]
        NAV --> SS[Super Admin Screens]
        NAV --> ONB[Onboarding Screens]
        NAV --> AUTH_UI[Login Screen\nPassword + OTP tabs]
    end

    subgraph APILayer["API Layer — Express.js"]
        direction TB
        MW[Middleware Stack]
        MW --> HELMET[Helmet\nSecurity Headers]
        MW --> CORS[CORS]
        MW --> RATE[Rate Limiter]
        MW --> JWT_MW[JWT Authenticate]
        MW --> RBAC[requireRole / requireOnboarded]

        ROUTES[Route Modules]
        ROUTES --> AUTH_R[/api/auth]
        ROUTES --> AREA_R[/api/areas]
        ROUTES --> SHOP_R[/api/shops]
        ROUTES --> ORDER_R[/api/orders]
        ROUTES --> SUPPORT_R[/api/support]
        ROUTES --> ADMIN_R[/api/admin]
        ROUTES --> WEBHOOK_R[/api/webhooks]
    end

    subgraph ServiceLayer["Service Layer"]
        S1[cryptoService\nbcrypt, OTP hash]
        S2[tokenService\nJWT access + refresh]
        S3[otpService\nOTP sessions]
        S4[orderStateMachine\nstatus transitions]
        S5[orderService\nevents + details]
        S6[storageService\nlocal / cloudinary]
        S7[notificationService\nExpo push]
        S8[razorpayService\nUPI payments]
    end

    subgraph DataLayer["Data Layer"]
        SEQ[Sequelize ORM]
        PG[(PostgreSQL)]
        LOCAL[Local Uploads\n/uploads]
        CLOUD[Cloudinary CDN\noptional]
    end

    MA -->|REST + Bearer Token| MW
    MW --> ROUTES
    ROUTES --> ServiceLayer
    ServiceLayer --> SEQ
    SEQ --> PG
    S6 --> LOCAL
    S6 -.-> CLOUD
    WEBHOOK_R --> S8
    S8 --> RZP_EXT[Razorpay API]
    S7 --> EXPO_EXT[Expo Push API]
```

---

## 3. Monorepo Structure

```text
Localite/
├── apps/
│   ├── api/                        # Backend REST API
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── loadEnv.js      # loads .env + dev.local
│   │   │   ├── server.js           # Express bootstrap
│   │   │   ├── database.js         # Sequelize connection
│   │   │   ├── models/             # ORM models + associations
│   │   │   ├── routes/             # HTTP route handlers
│   │   │   ├── middleware/         # auth, rate limit, errors
│   │   │   ├── services/           # business logic
│   │   │   └── seeders/seed.js     # demo data
│   │   ├── uploads/                # local file storage
│   │   ├── .env.example            # ✅ committed — non-secret defaults
│   │   ├── dev.local.example       # ✅ committed — secret key template
│   │   └── dev.local               # 🚫 gitignored — real passwords & keys
│   │
│   └── mobile/                     # Expo React Native app
│       ├── App.js                  # root navigator + role routing
│       └── src/
│           ├── context/AuthContext.js
│           ├── services/api.js     # HTTP client + token refresh
│           └── screens/
│               ├── LoginScreen.js
│               ├── customer/       # shop browse, orders
│               ├── shopkeeper/       # inbox, manage orders
│               ├── admin/            # super admin approvals
│               └── onboarding/     # customer + admin setup
│
├── packages/
│   └── shared/                     # shared enums & constants
│       └── src/enums.js
│
├── docs/
│   └── architecture.md             # this file
│
├── .gitignore                      # blocks dev.local, .env, secrets/
└── docker-compose.yml              # PostgreSQL container
```

---

## 4. Authentication & Security

### 4.1 Dual Login Methods

```mermaid
flowchart TD
    START([User opens app]) --> CHOICE{Login method?}

    CHOICE -->|Password| PW_FLOW
    CHOICE -->|OTP| OTP_FLOW

    subgraph PW_FLOW["Password Authentication"]
        PW1[POST /api/auth/login/password\nidentifier + password]
        PW1 --> PW2{Valid credentials?}
        PW2 -->|No| PW_ERR[401 Invalid credentials]
        PW2 -->|Yes| TOKENS
    end

    subgraph OTP_FLOW["OTP Authentication"]
        OTP1[POST /api/auth/send-otp\nphone number]
        OTP1 --> OTP2[Create OtpSession\nbcrypt hash, 5 min TTL]
        OTP2 --> OTP3[SMS sent\nor dev console log]
        OTP3 --> OTP4[POST /api/auth/verify-otp\nphone + OTP]
        OTP4 --> OTP5{OTP valid?}
        OTP5 -->|No| OTP_ERR[401 / 429\nincrement attempts]
        OTP5 -->|Yes| OTP6{User exists?}
        OTP6 -->|No| OTP7[Auto-create customer user]
        OTP6 -->|Yes| TOKENS
        OTP7 --> TOKENS
    end

    subgraph TOKENS["Token Issuance"]
        TOKENS1[Issue JWT access token\n15 min expiry]
        TOKENS2[Issue refresh token\n7 days, SHA-256 stored in DB]
        TOKENS1 --> TOKENS2
        TOKENS2 --> STORE[Store tokens in\nExpo SecureStore]
    end

    STORE --> ONBOARD{isOnboarded?}
    ONBOARD -->|No| ONBOARD_SCREEN[Onboarding flow]
    ONBOARD -->|Yes| ROLE_ROUTE[Route by role]
```

### 4.2 Registration (Password)

```mermaid
sequenceDiagram
    participant U as User
    participant M as Mobile App
    participant A as API
    participant DB as PostgreSQL

    U->>M: Register (name, phone, password, role)
    M->>A: POST /api/auth/register/password
    A->>A: validatePassword (8+ chars, upper/lower/number)
    A->>A: bcrypt hash (12 rounds)
    A->>DB: Create User (role: customer | admin)
    A->>DB: Create RefreshToken
    A-->>M: accessToken + refreshToken + user
    M->>M: Save to SecureStore
    M->>U: Show onboarding screen
```

### 4.3 Token Refresh Flow

```mermaid
sequenceDiagram
    participant M as Mobile App
    participant A as API
    participant DB as PostgreSQL

    M->>A: API request with expired access token
    A-->>M: 401 Unauthorized
    M->>A: POST /api/auth/refresh { refreshToken }
    A->>DB: Lookup RefreshToken by SHA-256 hash
    A->>A: Verify not revoked / not expired
    A->>DB: Revoke old refresh token (rotation)
    A->>DB: Create new RefreshToken
    A-->>M: New accessToken + refreshToken
    M->>A: Retry original request
```

### 4.4 Security Controls

| Control | Implementation |
|---------|----------------|
| Password hashing | bcrypt, 12 rounds (`BCRYPT_ROUNDS`) |
| OTP storage | bcrypt-hashed, never stored in plaintext |
| OTP expiry | 5 minutes (`OTP_TTL_MS`) |
| OTP brute-force | Max 5 attempts per session, then invalidated |
| Rate limiting | 30 req/15 min on auth routes; 3 OTP sends/min per phone |
| Access tokens | JWT, 15 min expiry, signed with `JWT_SECRET` |
| Refresh tokens | Opaque 48-byte hex, SHA-256 hash in DB, rotation on use |
| HTTP headers | Helmet (CSP, XSS, etc.) |
| Authorization | Role middleware on every protected route |
| Shop scoping | `ShopUser` junction table — admin can only access linked shops |
| Payment verification | Razorpay HMAC signature on client callback + webhook |
| File uploads | 5 MB limit, image MIME validation, multer |
| Secrets management | Passwords & API keys in `dev.local` only — **never committed to git** |

```mermaid
flowchart LR
    REQ[Incoming Request] --> HELMET[Helmet]
    HELMET --> CORS[CORS]
    CORS --> RATE[Rate Limiter\nauth routes only]
    RATE --> AUTH{Bearer token?}
    AUTH -->|No| REJECT401[401]
    AUTH -->|Yes| VERIFY[JWT verify\n+ load user from DB]
    VERIFY --> ACTIVE{isActive?}
    ACTIVE -->|No| REJECT401
    ACTIVE -->|Yes| ROLE{requireRole?}
    ROLE -->|Fail| REJECT403[403]
    ROLE -->|Pass| ONBOARDED{requireOnboarded?}
    ONBOARDED -->|Fail| REJECT403B[403 ONBOARDING_REQUIRED]
    ONBOARDED -->|Pass| HANDLER[Route Handler]
```

### 4.5 Secrets & Configuration (summary)

All passwords and API keys are stored in **`apps/api/dev.local`** (gitignored).  
Non-secret defaults live in **`apps/api/.env.example`** (safe to commit).  
See [Section 16](#16-secrets--configuration-management) for full details.

---

## 5. Role-Based Access Control (RBAC)

### 5.1 Role Definitions

```mermaid
flowchart TD
    subgraph Roles
        SA[super_admin\nPlatform operator]
        ADM[admin\nShop owner / store keeper]
        CUS[customer\nEnd user]
    end

    SA -->|can| SA_PERMS["✅ Approve/reject shops\n✅ Create areas & shops\n✅ Manage all users & roles\n✅ Access any shop's orders\n✅ Full write on all features"]
    ADM -->|can| ADM_PERMS["✅ View own shop orders\n✅ Accept orders + set amount\n✅ Set delivery time windows\n✅ Mark shipped / delivered\n✅ Update own shop details\n✅ Handle support tickets"]
    CUS -->|can| CUS_PERMS["✅ Browse approved shops\n✅ Place orders (text / photo)\n✅ Select payment method\n✅ Mark order received\n✅ Create support tickets"]
```

### 5.2 Permission Matrix

| Feature | Super Admin | Admin | Customer |
|---------|:-----------:|:-----:|:--------:|
| Browse shops | ✅ | ✅ | ✅ |
| Place order | ❌ | ❌ | ✅ |
| Accept / ship order | ✅ (any shop) | ✅ (own shop) | ❌ |
| Mark delivered | ✅ | ✅ | ✅ (own order) |
| Apply for shop | ❌ | ✅ | ❌ |
| Approve shop | ✅ | ❌ | ❌ |
| Manage areas | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Support tickets (create) | ❌ | ❌ | ✅ |
| Support tickets (resolve) | ✅ | ✅ (own shop) | ❌ |
| Onboarding | N/A (seed) | ✅ | ✅ |

### 5.3 Shop Access Scoping

```mermaid
flowchart TD
  REQ[Admin requests shop orders] --> CHECK{role?}
  CHECK -->|super_admin| ALLOW[Allow — all shops]
  CHECK -->|admin| LOOKUP[Query ShopUser\nuserId + shopId]
  LOOKUP --> LINKED{Link exists?}
  LINKED -->|Yes| ALLOW
  LINKED -->|No| DENY[403 Forbidden]
```

---

## 6. Functional Modules

```mermaid
flowchart TB
    subgraph MOD_AUTH["🔐 Auth Module"]
        A1[Password register/login]
        A2[OTP send/verify]
        A3[Token refresh/logout]
        A4[Profile management]
        A5[Device registration]
    end

    subgraph MOD_ONBOARD["📋 Onboarding Module"]
        O1[Customer onboarding\nname + address + area]
        O2[Admin profile setup]
        O3[Shop application\npending approval]
        O4[Super admin approval queue]
    end

    subgraph MOD_DISCOVERY["🏪 Discovery Module"]
        D1[Area listing]
        D2[Top 20 shops per area\nrank + verified filter]
        D3[Shop detail by category]
    end

    subgraph MOD_ORDER["📦 Order Module"]
        OR1[Submit text list]
        OR2[Submit image scan]
        OR3[4-stage state machine]
        OR4[Order event audit log]
        OR5[Order timeline]
    end

    subgraph MOD_PAY["💳 Payment Module"]
        P1[Payment method selection\nUPI / COD]
        P2[Razorpay order creation]
        P3[Payment verification]
        P4[Webhook handler]
        P5[Dev mock payment]
    end

    subgraph MOD_SUPPORT["🎫 Support Module"]
        S1[Create ticket]
        S2[Delivery instructions]
        S3[Complaint tracking\nOpen → Acknowledged → Resolved]
    end

    subgraph MOD_NOTIFY["🔔 Notification Module"]
        N1[Expo push token registration]
        N2[Order status push alerts]
        N3[Shop approval notifications]
    end

    subgraph MOD_ADMIN["⚙️ Admin Module"]
        AD1[Shop CRUD]
        AD2[Area management]
        AD3[User role management]
        AD4[Approval workflow]
    end

    MOD_AUTH --> MOD_ONBOARD
    MOD_ONBOARD --> MOD_DISCOVERY
    MOD_DISCOVERY --> MOD_ORDER
    MOD_ORDER --> MOD_PAY
    MOD_ORDER --> MOD_SUPPORT
    MOD_ORDER --> MOD_NOTIFY
    MOD_ONBOARD --> MOD_ADMIN
```

---

## 7. Database Schema

**SQL reference (keep updated with model changes):** [`docs/app.sql`](./app.sql) (schema) · [`docs/seed-data.sql`](./seed-data.sql) (demo data) · [`docs/database.md`](./database.md) (how to apply)

### 7.1 Entity-Relationship Diagram

```mermaid
erDiagram
    Area {
        uuid id PK
        string name
        string city
        boolean is_active
    }

    User {
        uuid id PK
        string name
        string phone UK
        string username UK
        string email UK
        string password_hash
        text address
        uuid area_id FK
        enum role
        boolean is_onboarded
        datetime phone_verified_at
        boolean is_active
        datetime last_login_at
        string profile_picture_url
    }

    Shop {
        uuid id PK
        string name
        enum category
        string owner_name
        string phone
        text address
        text item_types
        text description
        string logo_url
        int rank
        enum status
        boolean is_verified
        uuid area_id FK
        uuid applied_by_id FK
        uuid approved_by_id FK
        datetime approved_at
        text rejection_reason
    }

    ShopUser {
        uuid id PK
        uuid shop_id FK
        uuid user_id FK
        enum role
    }

    Order {
        uuid id PK
        uuid customer_id FK
        uuid shop_id FK
        enum order_type
        text text_payload
        string image_payload_url
        enum order_status
        decimal final_bill_amount
        string delivery_time_window
        enum payment_method
        enum payment_status
        string razorpay_order_id
        string razorpay_payment_id
    }

    OrderEvent {
        uuid id PK
        uuid order_id FK
        uuid actor_id FK
        string from_status
        string to_status
        text note
        datetime created_at
    }

    SupportTicket {
        uuid id PK
        uuid order_id FK
        uuid shop_id FK
        uuid customer_id FK
        enum issue_type
        text customer_message
        text shopkeeper_resolution
        enum ticket_status
    }

    OtpSession {
        uuid id PK
        string phone
        string otp_hash
        datetime expires_at
        int attempts
        boolean is_used
    }

    RefreshToken {
        uuid id PK
        uuid user_id FK
        string token_hash
        datetime expires_at
        datetime revoked_at
        string user_agent
    }

    UserDevice {
        uuid id PK
        uuid user_id FK
        string expo_push_token
        enum platform
        boolean is_active
    }

    Area ||--o{ Shop : "has many"
    Area ||--o{ User : "residents in"
    User ||--o{ Shop : "staff via"
    Shop ||--o{ ShopUser : ""
    User ||--o{ ShopUser : ""
    User ||--o{ Order : "places"
    Shop ||--o{ Order : "receives"
    Order ||--o{ OrderEvent : "audit trail"
    User ||--o{ OrderEvent : "actor"
    Order ||--o{ SupportTicket : "has"
    Shop ||--o{ SupportTicket : "handles"
    User ||--o{ SupportTicket : "creates"
    User ||--o{ RefreshToken : "sessions"
    User ||--o{ UserDevice : "push tokens"
    User ||--o{ Shop : "applies for"
    User ||--o{ Shop : "approves"
```

### 7.2 Enums Reference

| Enum | Values |
|------|--------|
| `UserRole` | `super_admin`, `admin`, `customer` |
| `ShopStatus` | `pending`, `approved`, `rejected` |
| `ShopCategory` | `Sweets`, `Medicines`, `Vegetables`, `Bakery`, `Grocery` |
| `OrderType` | `Text_List`, `Image_Scan` |
| `OrderStatus` | `Created`, `Accepted`, `Shipped`, `Delivered` |
| `PaymentMethod` | `UPI_Instant`, `Cash_On_Delivery` |
| `PaymentStatus` | `Pending`, `Paid`, `Failed`, `Not_Required` |
| `TicketIssueType` | `Delivery_Instruction`, `Wrong_Item`, `Damaged_Product`, `Delayed_Delivery`, `Other` |
| `TicketStatus` | `Open`, `Acknowledged`, `Resolved` |

---

## 8. Order Lifecycle

### 8.1 State Machine

```mermaid
stateDiagram-v2
    [*] --> Created : Customer submits\ntext list or photo

    Created --> Accepted : Admin accepts\n+ sets amount\n+ delivery window

    state Accepted {
        [*] --> AwaitingPayment
        AwaitingPayment --> PaymentSelected : Customer picks\nUPI or COD
        PaymentSelected --> UPIPaid : UPI payment\nconfirmed
        PaymentSelected --> CODReady : COD selected\n(no gateway needed)
    }

    Accepted --> Shipped : Admin dispatches\n(blocked until payment rules met)

    Shipped --> Delivered : Customer confirms\nOR Admin marks delivered

    Delivered --> [*]
```

### 8.2 Order Flow Sequence

```mermaid
sequenceDiagram
    participant C as Customer
    participant API as API
    participant DB as Database
    participant A as Admin
    participant PUSH as Expo Push
    participant RZP as Razorpay

    C->>API: POST /orders/submit-flexible-order
    API->>DB: Create Order (Created)
    API->>DB: Record OrderEvent
    API->>PUSH: Notify admin — new order
    API-->>C: Order created

    A->>API: PATCH /orders/transition/accept/:id
    API->>DB: Update amount + delivery window
    API->>PUSH: Notify customer — order accepted
    API-->>A: Order accepted

    C->>API: PATCH /orders/transition/select-payment/:id
    alt UPI Instant
        C->>API: POST /orders/transition/create-razorpay-order/:id
        API->>RZP: Create Razorpay order
        RZP-->>API: razorpay_order_id
        C->>RZP: Complete UPI payment
        C->>API: POST /orders/transition/verify-payment/:id
        API->>API: Verify HMAC signature
        API->>DB: paymentStatus = Paid
    else Cash on Delivery
        API->>DB: paymentStatus = Not_Required
    end

    A->>API: PATCH /orders/transition/ship/:id
    API->>DB: orderStatus = Shipped
    API->>PUSH: Notify customer — on the way
    API-->>A: Shipped

    C->>API: PATCH /orders/transition/deliver/:id
    API->>DB: orderStatus = Delivered
    API->>PUSH: Notify admin — delivery confirmed
    API-->>C: Delivered
```

### 8.3 Ship Gate Rules

An order **cannot** be shipped until:

1. `paymentMethod` is set (customer has chosen UPI or COD)
2. If `UPI_Instant` → `paymentStatus` must be `Paid`
3. If `Cash_On_Delivery` → `paymentStatus` is `Not_Required` (no gateway call needed)

---

## 9. Payment Flow

```mermaid
flowchart TD
    ACCEPTED[Order Accepted\nAdmin set amount] --> SELECT[Customer selects payment method]

    SELECT -->|UPI_Instant| UPI_PATH
    SELECT -->|Cash_On_Delivery| COD_PATH

    subgraph UPI_PATH["UPI via Razorpay"]
        U1{Razorpay configured?}
        U1 -->|Yes| U2[POST create-razorpay-order]
        U2 --> U3[Open Razorpay checkout]
        U3 --> U4[POST verify-payment\nHMAC signature check]
        U4 --> U5[paymentStatus = Paid]
        U1 -->|No dev| U6[PATCH pay — mock]
        U6 --> U5
    end

    subgraph COD_PATH["Cash on Delivery"]
        C1[paymentStatus = Not_Required]
    end

    U5 --> SHIP_READY[Ready to ship]
    C1 --> SHIP_READY

    subgraph WEBHOOK["Razorpay Webhook (async backup)"]
        W1[POST /api/webhooks/razorpay]
        W1 --> W2[Verify webhook signature]
        W2 --> W3[payment.captured event]
        W3 --> W4[Update order paymentStatus]
    end

    U3 -.->|async| WEBHOOK
```

---

## 10. Onboarding Flows

### 10.1 Customer Onboarding

```mermaid
flowchart TD
    REG[Register / OTP login\nrole = customer] --> CHECK{isOnboarded?}
    CHECK -->|Yes| APP[Customer App]
    CHECK -->|No| FORM[Onboarding Screen]
    FORM --> F1[Enter name]
    F1 --> F2[Enter delivery address]
    F2 --> F3[Select area]
    F3 --> API[POST /api/auth/onboard/customer]
    API --> DONE[isOnboarded = true]
    DONE --> APP
```

### 10.2 Shop Owner Onboarding

```mermaid
flowchart TD
    REG[Register as Store Owner\nrole = admin] --> PROFILE[Step 1: Profile\nname + address]
    PROFILE --> API1[POST /api/auth/onboard/admin]
    API1 --> SHOP_FORM[Step 2: Shop Application]
    SHOP_FORM --> F1[Shop name + category]
    F1 --> F2[Address + phone]
    F2 --> F3[Item types description]
    F3 --> API2[POST /api/shops/apply]
    API2 --> PENDING[Shop status = pending]
    PENDING --> SA_REVIEW[Super Admin reviews]
    SA_REVIEW -->|Approve| APPROVED[status = approved\nShopUser link created\nPush notification sent]
    SA_REVIEW -->|Reject| REJECTED[status = rejected\nreason stored]
    APPROVED --> ADMIN_APP[Admin Dashboard\norder inbox active]
```

### 10.3 Super Admin Shop Approval

```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant API as API
    participant DB as Database
    participant ADM as Shop Owner
    participant PUSH as Expo Push

    SA->>API: GET /api/admin/shops/pending
    API-->>SA: List of pending applications

    alt Approve
        SA->>API: PATCH /api/admin/shops/:id/approve { rank }
        API->>DB: status=approved, isVerified=true
        API->>DB: Create ShopUser (owner link)
        API->>PUSH: Notify shop owner — approved
    else Reject
        SA->>API: PATCH /api/admin/shops/:id/reject { reason }
        API->>DB: status=rejected, rejectionReason
        API->>PUSH: Notify shop owner — rejected
    end
```

---

## 11. Notifications

```mermaid
flowchart LR
    subgraph TriggerEvents
        E1[Order Created]
        E2[Order Accepted]
        E3[Order Shipped]
        E4[Order Delivered]
        E5[Shop Approved/Rejected]
    end

    subgraph NotificationService
        NS[notificationService.js]
        NS --> LOOKUP[Query UserDevice\nactive tokens]
        LOOKUP --> EXPO[expo-server-sdk\nchunk + send]
    end

    subgraph Recipients
        R1[Customer devices]
        R2[Admin / shop staff devices]
    end

    E1 -->|notify admin| NS
    E2 -->|notify customer| NS
    E3 -->|notify customer| NS
    E4 -->|notify admin| NS
    E5 -->|notify applicant| NS

    EXPO --> R1
    EXPO --> R2
```

| Event | Recipient | Message |
|-------|-----------|---------|
| Order Created | Shop admin(s) | "New order from {customer}" |
| Order Accepted | Customer | "Order accepted. Amount: ₹{amount}" |
| Order Shipped | Customer | "Your order has been shipped" |
| Order Delivered | Shop admin(s) | "Order delivered to {customer}" |
| Shop Approved | Applicant | "Your shop is now live on Localite" |
| Shop Rejected | Applicant | "Your application was not approved" |

---

## 12. File Storage

```mermaid
flowchart TD
    UPLOAD[Customer uploads\nhandwritten list photo] --> MULTER[Multer middleware\n5 MB, image only]
    MULTER --> STORAGE{STORAGE_PROVIDER}

    STORAGE -->|local default| LOCAL[Save to apps/api/uploads/\nServe at /uploads/:filename]
    STORAGE -->|cloudinary| CLOUD[Upload to Cloudinary\nReturn CDN secure_url]

    LOCAL --> DB_STORE[Store URL in\nOrder.image_payload_url]
    CLOUD --> DB_STORE
```

| Provider | Env | Use Case |
|----------|-----|----------|
| `local` | `STORAGE_PROVIDER=local` | Development, no cloud subscription |
| `cloudinary` | `STORAGE_PROVIDER=cloudinary` + cloud credentials | Production CDN |

---

## 13. API Reference Map

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register/password` | Public | Register with password |
| POST | `/login/password` | Public | Login with phone/username/email |
| POST | `/send-otp` | Public | Send OTP (rate limited) |
| POST | `/verify-otp` | Public | Verify OTP and login |
| POST | `/refresh` | Public | Rotate refresh token |
| POST | `/logout` | Bearer | Revoke refresh token |
| GET | `/me` | Bearer | Current user profile |
| PATCH | `/profile` | Bearer | Update profile |
| POST | `/onboard/customer` | Customer | Complete customer onboarding |
| POST | `/onboard/admin` | Bearer | Complete admin profile |
| POST | `/set-password` | Bearer | Set / change password |
| POST | `/device/register` | Bearer | Register Expo push token |
| POST | `/device/unregister` | Bearer | Unregister push token |

### Areas — `/api/areas`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Public | List active areas |
| GET | `/:areaId` | Public | Area detail |

### Shops — `/api/shops`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/area/:areaId` | Public | Top 20 approved shops |
| GET | `/:shopId` | Public | Shop detail |
| POST | `/apply` | Admin | Submit shop application |
| GET | `/my/application` | Admin | Own shop applications |
| PATCH | `/my/:shopId` | Admin | Update own shop details |

### Orders — `/api/orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/submit-flexible-order` | Customer | Place order (text/image) |
| GET | `/my` | Customer | Customer's orders |
| GET | `/shop/:shopId` | Admin | Shop order inbox |
| GET | `/:orderId` | Bearer | Order detail + timeline |
| PATCH | `/transition/accept/:id` | Admin | Accept + set amount/window |
| PATCH | `/transition/select-payment/:id` | Customer | Choose UPI or COD |
| POST | `/transition/create-razorpay-order/:id` | Customer | Create Razorpay order |
| POST | `/transition/verify-payment/:id` | Customer | Verify UPI payment |
| PATCH | `/transition/pay/:id` | Customer | Dev mock payment |
| PATCH | `/transition/ship/:id` | Admin | Mark shipped |
| PATCH | `/transition/deliver/:id` | Customer/Admin | Mark delivered |

### Support — `/api/support`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-ticket` | Customer | Create support ticket |
| GET | `/my` | Customer | Own tickets |
| GET | `/merchant/active/:shopId` | Admin | Shop's active tickets |
| PATCH | `/update-ticket/:id` | Admin | Acknowledge / resolve |

### Admin — `/api/admin` (Super Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shops/pending` | Pending shop applications |
| PATCH | `/shops/:id/approve` | Approve shop |
| PATCH | `/shops/:id/reject` | Reject shop |
| GET | `/shops` | All shops |
| POST | `/shops` | Directly create shop |
| POST | `/areas` | Create area |
| GET | `/users` | All users |
| PATCH | `/users/:id/role` | Change user role |

### Webhooks — `/api/webhooks`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/razorpay` | Razorpay payment.captured webhook |

---

## 14. Mobile App Navigation

```mermaid
flowchart TD
    START([App Launch]) --> LOAD[Load tokens\nfrom SecureStore]
    LOAD --> AUTH{Authenticated?}

    AUTH -->|No| LOGIN[LoginScreen\nPassword tab | OTP tab]
    AUTH -->|Yes| ONBOARD{isOnboarded?}

    ONBOARD -->|No| ONBOARD_ROUTE{role?}
    ONBOARD_ROUTE -->|customer| C_ONB[CustomerOnboardingScreen]
    ONBOARD_ROUTE -->|admin| A_ONB[AdminOnboardingScreen\nStep 1: Profile\nStep 2: Shop Application]

    ONBOARD -->|Yes| ROLE{role?}

    ROLE -->|super_admin| SA_NAV[SuperAdminStack]
    SA_NAV --> SA1[Approvals Screen\nPending shop applications]

    ROLE -->|admin| ADM_NAV[AdminStack]
    ADM_NAV --> ADM1[ShopInboxScreen\nOrder inbox]
    ADM_NAV --> ADM2[ManageOrderScreen\nAccept / Ship / Deliver]

    ROLE -->|customer| CUS_NAV[CustomerStack]
    CUS_NAV --> CUS_TABS[Bottom Tabs]
    CUS_TABS --> CUS1[ShopListScreen\nBrowse top shops]
    CUS_TABS --> CUS2[MyOrdersScreen\nOrder history]
    CUS_NAV --> CUS3[PlaceOrderScreen\nText + photo upload]
    CUS_NAV --> CUS4[OrderDetailScreen\nTrack + Pay + Deliver]
```

---

## 15. External Integrations

```mermaid
flowchart LR
    subgraph Localite
        API[Express API]
        MOBILE[Expo Mobile]
    end

    subgraph Production
        RZP[Razorpay\nUPI payments]
        EXPO[Expo Push Service\nnotifications]
        CLD[Cloudinary\nimage CDN]
        SMS[SMS Provider\nMSG91 / Twilio\nfuture]
    end

    subgraph Infrastructure
        PG[(PostgreSQL)]
        DOCKER[Docker Compose\ndev database]
    end

    MOBILE -->|JWT REST| API
    API --> PG
    DOCKER -.->|hosts| PG
    API -->|create/verify orders| RZP
    RZP -->|webhook| API
    API -->|push tokens| EXPO
    EXPO -->|deliver| MOBILE
    API -.->|image upload| CLD
    API -.->|OTP delivery| SMS
```

| Integration | Status | Config file |
|-------------|--------|-------------|
| PostgreSQL | ✅ Active | `DB_*` in `.env` / password in `dev.local` |
| Razorpay UPI | ✅ Ready (mock in dev) | `RAZORPAY_*` in `dev.local` |
| Expo Push | ✅ Active | `expo-server-sdk` + device registration |
| Local Storage | ✅ Default | `STORAGE_PROVIDER=local` in `.env` |
| Cloudinary | ✅ Ready | `CLOUDINARY_*` in `dev.local` |
| SMS OTP | 🔜 Planned | MSG91 / Twilio / Firebase keys in `dev.local` |

---

## 16. Secrets & Configuration Management

### 16.1 Policy

> **All passwords, tokens, and API keys MUST live in `dev.local` and MUST NEVER be checked into git.**

| File | Committed? | Purpose |
|------|:----------:|---------|
| `apps/api/.env.example` | ✅ Yes | Non-secret defaults (ports, DB host, timeouts) |
| `apps/api/dev.local.example` | ✅ Yes | Template showing which secret keys are needed |
| `apps/api/dev.local` | 🚫 **Never** | Real passwords, JWT secrets, API keys |
| `apps/api/.env` | 🚫 **Never** | Optional local overrides (also gitignored) |

### 16.2 Environment Loading Order

`apps/api/src/config/loadEnv.js` is called at startup by `server.js`, `database.js`, and `seed.js`.

```mermaid
flowchart TD
    START([API starts]) --> LOAD1{apps/api/.env\nexists?}
    LOAD1 -->|Yes| ENV[Load .env\nnon-secret defaults]
    LOAD1 -->|No| LOAD2
    ENV --> LOAD2{apps/api/dev.local\nexists?}
    LOAD2 -->|Yes| LOCAL[Load dev.local\noverride with secrets]
    LOAD2 -->|No| WARN[Console warning:\ncopy dev.local.example]
    LOCAL --> READY[process.env populated]
    WARN --> READY
```

**Override rule:** `dev.local` always wins over `.env` for duplicate keys.

### 16.3 First-Time Developer Setup

```bash
cd Localite
npm install

# Non-secret defaults (optional)
cp apps/api/.env.example apps/api/.env

# Secrets — required
cp apps/api/dev.local.example apps/api/dev.local
# Edit dev.local with your real passwords before running seed/api
```

### 16.4 What Goes Where

| Variable | File | Secret? |
|----------|------|:-------:|
| `PORT`, `NODE_ENV`, `API_BASE_URL` | `.env` | No |
| `DB_NAME`, `DB_USER`, `DB_HOST`, `DB_PORT` | `.env` | No |
| `DB_PASSWORD` | `dev.local` | **Yes** |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | `dev.local` | **Yes** |
| `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY_DAYS` | `.env` | No |
| `DEV_OTP` | `dev.local` | **Yes** |
| `BCRYPT_ROUNDS`, `OTP_TTL_MS`, `OTP_MAX_ATTEMPTS` | `.env` | No |
| `STORAGE_PROVIDER`, `UPLOAD_DIR` | `.env` | No |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | `dev.local` | **Yes** |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `dev.local` | **Yes** |
| `SUPER_ADMIN_PHONE`, `SUPER_ADMIN_PASSWORD` | `dev.local` | **Yes** |
| `SUPER_ADMIN_NAME` | `.env` | No |

### 16.5 Gitignore Rules

Root `.gitignore` blocks all secret files from ever being committed:

```text
# Secrets — NEVER commit
.env
.env.*
!.env.example
dev.local
**/dev.local
*.dev.local
.env.local
.env.development.local
.env.production.local
secrets/
**/secrets/
```

Verify locally:

```bash
git check-ignore -v apps/api/dev.local
# Expected: Localite/.gitignore:**/dev.local  apps/api/dev.local
```

### 16.6 Production Considerations

In production, do **not** use `dev.local`. Instead inject secrets via:

- Cloud provider secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)
- CI/CD pipeline environment variables
- Container orchestration secrets (Kubernetes Secrets, Docker Swarm secrets)

The `loadEnv()` pattern is for **local development only**. Production should set `NODE_ENV=production` and supply secrets through the deployment platform.

---

## Appendix: Environment Variable Reference

### dev.local (secrets — 🚫 never commit)

Copy from `apps/api/dev.local.example`:

```env
# Database password
DB_PASSWORD=your_db_password

# JWT signing secrets (use long random strings)
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Dev OTP (development only)
DEV_OTP=123456

# Super admin seed credentials
SUPER_ADMIN_PHONE=9000000001
SUPER_ADMIN_PASSWORD=YourStrongPassword@123

# Razorpay (leave empty to use dev mock payment)
# RAZORPAY_KEY_ID=rzp_test_xxxxx
# RAZORPAY_KEY_SECRET=xxxxx
# RAZORPAY_WEBHOOK_SECRET=xxxxx

# Cloudinary (only when STORAGE_PROVIDER=cloudinary)
# CLOUDINARY_CLOUD_NAME=xxxxx
# CLOUDINARY_API_KEY=xxxxx
# CLOUDINARY_API_SECRET=xxxxx
```

### .env / .env.example (non-secret — ✅ safe to commit)

```env
# Server
PORT=5000
NODE_ENV=development
API_BASE_URL=http://localhost:5000

# Database (password in dev.local)
DB_NAME=localite_db
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432

# JWT timing (secrets in dev.local)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY_DAYS=7

# Auth settings (OTP value in dev.local)
BCRYPT_ROUNDS=12
OTP_TTL_MS=300000
OTP_MAX_ATTEMPTS=5

# Storage (Cloudinary credentials in dev.local)
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads

# Super admin display name (credentials in dev.local)
SUPER_ADMIN_NAME=Super Admin
```
Demo logins (after seed):

| Role | Login | Email | Password |
|------|-------|-------|----------|
| Customer | 8888888888 | customer@localite.dev | Customer@123 |
| Shop Admin | 9999999999 | shopkeeper@localite.dev | Admin@12345 |
| Super Admin | 9000000001 | superadmin@localite.dev | SuperAdmin@123 |
| OTP (any phone) | — | — | 123456 |

Email security code in dev: **123456** (same as `DEV_OTP` in `dev.local`).
---

*Last updated: August 2026 · Localite MVP v0.2 · secrets via dev.local*
