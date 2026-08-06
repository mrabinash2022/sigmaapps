# Localite

Hyper-local trust-based commerce — order from shops you already know.

Part of the [sigmaapps](https://github.com/mrabinash2022/sigmaapps) monorepo.

## Features

- **Dual auth:** Password login or mobile OTP (bcrypt, JWT access + refresh tokens, rate limiting)
- **Role-based access:** Super Admin, Admin (shop owner), Customer
- **Onboarding:** Customer profile setup; shop owner application with super admin approval
- **Orders:** Text list or photo upload → accept → pay (Razorpay UPI or COD) → ship → deliver
- **Push notifications:** Expo push on order status changes
- **Storage:** Local disk by default; Cloudinary optional via env

## Quick start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install & configure

```bash
cd Localite
npm install
cp apps/api/.env.example apps/api/.env          # optional non-secret defaults
cp apps/api/dev.local.example apps/api/dev.local  # passwords & secrets (required)
```

Edit `apps/api/dev.local` with your real passwords. **Never commit `dev.local`** — it is gitignored.

### 3. Seed & run

```bash
npm run api:seed
npm run api
npm run mobile
```

## Demo accounts (after seed)

| Role | Login | Password |
|------|-------|----------|
| Super Admin | `9000000001` or `superadmin` | `SuperAdmin@123` |
| Shop Admin | `9999999999` or `shopadmin` | `Admin@12345` |
| Customer | `8888888888` or `customer1` | `Customer@123` |
| OTP (any phone) | — | `123456` (dev mode) |

## Roles

| Role | Capabilities |
|------|-------------|
| **Super Admin** | Approve/reject shops, manage areas & users, full write access |
| **Admin** | Manage own shop orders, set amounts & delivery windows, mark shipped/delivered |
| **Customer** | Browse shops, place orders (text/photo), pay, mark received, support tickets |

## Auth endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/password` | Register with password |
| POST | `/api/auth/login/password` | Login with phone/username/email + password |
| POST | `/api/auth/send-otp` | Send OTP to phone |
| POST | `/api/auth/verify-otp` | Verify OTP and login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/onboard/customer` | Complete customer onboarding |
| POST | `/api/auth/onboard/admin` | Complete shop owner profile |
| POST | `/api/shops/apply` | Submit shop for approval |

## Environment variables

See `apps/api/.env.example` for full list. Key ones:

```env
STORAGE_PROVIDER=local          # or cloudinary
RAZORPAY_KEY_ID=                # leave empty for dev mock payment
RAZORPAY_KEY_SECRET=
JWT_SECRET=                     # use strong random strings
```

## Project structure

```text
Localite/
├── apps/api/           # Express + PostgreSQL + Sequelize
├── apps/mobile/        # Expo React Native
├── packages/shared/    # Enums & constants
└── docker-compose.yml  # PostgreSQL
```
