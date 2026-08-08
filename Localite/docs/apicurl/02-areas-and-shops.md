# Areas & Shops

## List areas (public)

```bash
curl -s "$BASE_URL/api/areas" | jq .
export AREA_ID=$(curl -s "$BASE_URL/api/areas" | jq -r '.areas[0].id')
```

---

## Get area by ID (public)

```bash
curl -s "$BASE_URL/api/areas/$AREA_ID" | jq .
```

---

## List shops in area (public — enabled & approved only)

```bash
curl -s "$BASE_URL/api/shops/area/$AREA_ID" | jq .
```

With pagination and category filter:

```bash
curl -s "$BASE_URL/api/shops/area/$AREA_ID?page=1&limit=20&category=Grocery" | jq .
```

Categories: `Sweets`, `Medicines`, `Vegetables`, `Bakery`, `Grocery`, `Flowers`, `Nursery`

---

## Get shop catalog (public)

Published products grouped for visual ordering.

```bash
curl -s "$BASE_URL/api/shops/$SHOP_ID/catalog" | jq .
```

---

## Get shop detail (public)

```bash
curl -s "$BASE_URL/api/shops/$SHOP_ID" | jq .
```

---

## Apply for shop (admin — self-service)

Requires admin role + auth.

```bash
curl -s -X POST "$BASE_URL/api/shops/apply" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"My Kirana Store\",
    \"category\": \"Grocery\",
    \"address\": \"Shop 12, Main Road\",
    \"phone\": \"9999999999\",
    \"itemTypes\": \"Rice, dal, oil, snacks\",
    \"description\": \"Neighborhood grocery\",
    \"areaId\": \"$AREA_ID\"
  }" | jq .
```

---

## Get my shop invitations (admin)

Shops created by super admin awaiting keeper registration.

```bash
curl -s "$BASE_URL/api/shops/my/invitations" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Complete shop registration (admin — after invite)

```bash
curl -s -X POST "$BASE_URL/api/shops/$SHOP_ID/complete-registration" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Patil Sweets\",
    \"category\": \"Sweets\",
    \"address\": \"Main Road, Pimple Saudagar\",
    \"phone\": \"9999999999\",
    \"itemTypes\": \"Ladoo, barfi, namkeen\",
    \"description\": \"Traditional sweets shop\",
    \"areaId\": \"$AREA_ID\",
    \"latitude\": 18.5912,
    \"longitude\": 73.7849
  }" | jq .
```

---

## Get my shop applications (admin)

```bash
curl -s "$BASE_URL/api/shops/my/application" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Update my approved shop (admin)

```bash
curl -s -X PATCH "$BASE_URL/api/shops/my/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9999999999",
    "address": "Updated address",
    "itemTypes": "Sweets, snacks",
    "description": "Updated description",
    "latitude": 18.5912,
    "longitude": 73.7849,
    "deliveryRadiusKm": 5,
    "lowStockThreshold": 10
  }' | jq .
```

`deliveryRadiusKm` limits how far customers can place delivery orders from the shop location.

---

## List shop staff (admin)

```bash
curl -s "$BASE_URL/api/shops/my/$SHOP_ID/staff" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Invite shop staff (owner only)

```bash
curl -s -X POST "$BASE_URL/api/shops/my/$SHOP_ID/staff/invite" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "name": "Staff Member"
  }' | jq .
```

Creates an admin user if the phone is new, then links them as `staff` for this shop.

---

## Remove shop staff (owner only)

```bash
curl -s -X DELETE "$BASE_URL/api/shops/my/$SHOP_ID/staff/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Low-stock catalog items (admin)

Returns published items at or below the shop's `lowStockThreshold` (default 5).

```bash
curl -s "$BASE_URL/api/shops/my/$SHOP_ID/low-stock" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```
