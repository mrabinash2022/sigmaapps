# Health & Auth

Set `BASE_URL` and `ACCESS_TOKEN` first (see [README](README.md)).

## Health

```bash
curl -s "$BASE_URL/api/health" | jq .
```

Returns `status`, `storage`, and `razorpay` enabled flag.

---

## Captcha (register flow)

```bash
curl -s "$BASE_URL/api/auth/captcha" | jq .
```

---

## Register email verification

Send code:

```bash
curl -s -X POST "$BASE_URL/api/auth/register/send-email-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}' | jq .
```

Verify code:

```bash
curl -s -X POST "$BASE_URL/api/auth/register/verify-email-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}' | jq .
```

---

## Register (password)

```bash
curl -s -X POST "$BASE_URL/api/auth/register/password" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "phone": "7777777777",
    "username": "testcustomer",
    "password": "Test@12345",
    "role": "customer"
  }' | jq .
```

Register as shop admin candidate (`role`: `"admin"`).

---

## Login (password)

### Super Admin

```bash
curl -s -X POST "$BASE_URL/api/auth/login/password" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$SUPER_ADMIN_ID\",\"password\":\"$SUPER_ADMIN_PASSWORD\"}" | jq .
```

### Shop Admin

```bash
curl -s -X POST "$BASE_URL/api/auth/login/password" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$SHOP_ADMIN_ID\",\"password\":\"$SHOP_ADMIN_PASSWORD\"}" | jq .
```

### Customer

```bash
curl -s -X POST "$BASE_URL/api/auth/login/password" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$CUSTOMER_ID\",\"password\":\"$CUSTOMER_PASSWORD\"}" | jq .
```

Save token:

```bash
export ACCESS_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login/password" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$SUPER_ADMIN_ID\",\"password\":\"$SUPER_ADMIN_PASSWORD\"}" | jq -r '.accessToken')
export REFRESH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login/password" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$SUPER_ADMIN_ID\",\"password\":\"$SUPER_ADMIN_PASSWORD\"}" | jq -r '.refreshToken')
```

---

## OTP auth (dev)

Send OTP:

```bash
curl -s -X POST "$BASE_URL/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"8888888888"}' | jq .
```

Verify OTP (dev OTP default: `123456`):

```bash
curl -s -X POST "$BASE_URL/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"8888888888","otp":"123456"}' | jq .
```

---

## Refresh token

```bash
curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq .
```

---

## Logout

```bash
curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq .
```

---

## Get current user

```bash
curl -s "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Update profile

```bash
curl -s -X PATCH "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "address": "123 Main St",
    "email": "user@example.com",
    "smsNotificationsEnabled": true,
    "whatsappNotificationsEnabled": false
  }' | jq .
```

`areaId` can also be updated when the customer moves to a different delivery area.

---

## Upload profile picture

```bash
curl -s -X POST "$BASE_URL/api/auth/profile/picture" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "picture=@/path/to/photo.jpg" | jq .
```

---

## Onboard customer

Requires customer role + auth.

```bash
curl -s -X POST "$BASE_URL/api/auth/onboard/customer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Demo Customer\",
    \"address\": \"Roseland Residency\",
    \"areaId\": \"$AREA_ID\"
  }" | jq .
```

---

## Onboard admin (shopkeeper profile)

```bash
curl -s -X POST "$BASE_URL/api/auth/onboard/admin" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shop Owner",
    "address": "Pimple Saudagar, Pune"
  }' | jq .
```

---

## Set / change password

```bash
curl -s -X POST "$BASE_URL/api/auth/set-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewPassword@123",
    "currentPassword": "Customer@123"
  }' | jq .
```

---

## Register push device

```bash
curl -s -X POST "$BASE_URL/api/auth/device/register" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expoPushToken": "ExponentPushToken[xxxxxxxx]",
    "platform": "android"
  }' | jq .
```

---

## Unregister push device

```bash
curl -s -X POST "$BASE_URL/api/auth/device/unregister" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expoPushToken": "ExponentPushToken[xxxxxxxx]"}' | jq .
```
