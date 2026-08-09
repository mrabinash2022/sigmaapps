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

## Update shop details

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quick Mart Updated",
    "category": "Grocery",
    "address": "New Market Road",
    "phone": "9876543210",
    "itemTypes": "Daily essentials, snacks",
    "description": "Updated description",
    "ownerName": "Owner Name",
    "rank": 5,
    "areaId": "'"$AREA_ID"'",
    "bulkBuyEnabled": true
  }' | jq .
```

`bulkBuyEnabled` — allow shop to participate in bulk buy campaigns and create store-originated campaigns. Shopkeepers only see bulk buy features in the app when this is `true`. Customers always have access to bulk buy regardless of this flag.

### Enable bulk buy partner

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bulkBuyEnabled": true}' | jq .
```

### Disable bulk buy partner

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bulkBuyEnabled": false}' | jq .
```

Verify the flag on the shopkeeper account:

```bash
curl -s "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $SHOP_ADMIN_TOKEN" | jq '.user.shops[] | {shopCode, bulkBuyEnabled}'
```

---

## Bulk buy platform settings

Super admin defaults for collection window, minimum group size, and auto-close grace after visit day.

```bash
curl -s "$BASE_URL/api/admin/bulk-buy-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

curl -s -X PATCH "$BASE_URL/api/admin/bulk-buy-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionPeriodDays": 7,
    "defaultMinSubscribers": 10,
    "autoCloseGraceDaysAfterDealDay": 3
  }' | jq .
```

| Field | Default | Description |
|-------|---------|-------------|
| `collectionPeriodDays` | 7 | Auto-expire `collecting` campaigns if min interest not met |
| `defaultMinSubscribers` | 10 | Default threshold when creating campaigns |
| `autoCloseGraceDaysAfterDealDay` | 3 | Days after confirmed visit day before auto-close |

See [09-bulk-buy.md](09-bulk-buy.md) for the full commitment and token payment flow.

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

With filters:

```bash
curl -s "$BASE_URL/api/admin/users?role=customer&accountStatus=enabled&page=1&limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

`role`: `customer`, `admin` (includes shop staff). `accountStatus`: `enabled`, `disabled`, `on_hold`.

---

## Create user (customer or store owner)

```bash
curl -s -X POST "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"New Customer\",
    \"phone\": \"7777777771\",
    \"email\": \"newcustomer@example.com\",
    \"password\": \"Customer@123\",
    \"address\": \"Roseland Residency\",
    \"areaId\": \"$AREA_ID\",
    \"role\": \"customer\"
  }" | jq .
```

Use `"role": "admin"` to create a store-owner account.

---

## Update user

```bash
curl -s -X PATCH "$BASE_URL/api/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Updated Name\",
    \"phone\": \"7777777771\",
    \"email\": \"updated@example.com\",
    \"address\": \"New address\",
    \"areaId\": \"$AREA_ID\",
    \"role\": \"customer\"
  }" | jq .
```

---

## Change user account status

Values: `enabled`, `disabled`, `on_hold`. Revokes tokens when not enabled.

```bash
curl -s -X PATCH "$BASE_URL/api/admin/users/$USER_ID/account-status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountStatus": "disabled"}' | jq .
```

---

## Delete user

Fails if the user has existing orders.

```bash
curl -s -X DELETE "$BASE_URL/api/admin/users/$USER_ID" \
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
