# Super Admin

All routes require **super_admin** role. Login as `9000000001` first.

```bash
export ACCESS_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"9000000001","password":"SuperAdmin@123"}' | jq -r '.accessToken')
```

---

## List pending shop applications

```bash
curl -s "$BASE_URL/api/admin/shops/pending" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Approve shop

Enables shop in master list with `operationalStatus: enabled`.

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID/approve" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rank": 10}' | jq .
```

---

## Reject shop

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID/reject" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason": "Incomplete documentation"}' | jq .
```

---

## List all shops (master list)

```bash
curl -s "$BASE_URL/api/admin/shops" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Invite shopkeeper (create shop with unique ID)

Creates shop in `invited` status and notifies keeper by phone.

```bash
curl -s -X POST "$BASE_URL/api/admin/shops/invite" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"shopCode\": \"LCT-PAK001\",
    \"ownerPhone\": \"9999999999\",
    \"areaId\": \"$AREA_ID\"
  }" | jq .
```

`shopCode` is optional (auto-generated if omitted). `areaId` is required.

---

## Directly create approved shop

Bypasses invitation flow — immediately approved.

```bash
curl -s -X POST "$BASE_URL/api/admin/shops" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"shopCode\": \"LCT-DIRECT01\",
    \"name\": \"Quick Mart\",
    \"category\": \"Grocery\",
    \"address\": \"Market Road\",
    \"phone\": \"9876543210\",
    \"ownerName\": \"Owner Name\",
    \"itemTypes\": \"Daily essentials\",
    \"areaId\": \"$AREA_ID\",
    \"rank\": 10
  }" | jq .
```

---

## Update shop operational status

Only for **approved** shops. Values: `enabled`, `disabled`, `on_hold`

Only **enabled** shops accept orders and appear to customers.

```bash
# Enable
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID/operational-status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operationalStatus": "enabled"}' | jq .

# Disable
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID/operational-status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operationalStatus": "disabled"}' | jq .

# On hold
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID/operational-status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operationalStatus": "on_hold"}' | jq .
```

---

## Delete shop

Fails if shop has existing orders.

```bash
curl -s -X DELETE "$BASE_URL/api/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Create area

```bash
curl -s -X POST "$BASE_URL/api/admin/areas" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pimple Saudagar",
    "city": "Pune (PCMC)"
  }' | jq .
```

---

## List all users

```bash
curl -s "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Change user role

Roles: `super_admin`, `admin`, `customer`

```bash
curl -s -X PATCH "$BASE_URL/api/admin/users/$USER_ID/role" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}' | jq .
```
