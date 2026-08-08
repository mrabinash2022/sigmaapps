# Home, Reports & Offers

## Customer home

```bash
curl -s "$BASE_URL/api/home/customer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Returns banners, announcements, favorite shops, and nearby shops for the customer's area.

---

## Shopkeeper home

```bash
curl -s "$BASE_URL/api/home/shopkeeper" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Super admin home

```bash
curl -s "$BASE_URL/api/home/super-admin?metric=revenue&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

`metric`: `revenue`, `orders`, or `shops`.

---

## Favorite shops (customer)

List IDs:

```bash
curl -s "$BASE_URL/api/home/favorites" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Add:

```bash
curl -s -X POST "$BASE_URL/api/home/favorites/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Remove:

```bash
curl -s -X DELETE "$BASE_URL/api/home/favorites/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Order reports (JSON)

Presets: `today`, `week`, `month`, `year`, `custom` (with `from` / `to` ISO dates).

```bash
curl -s "$BASE_URL/api/reports/orders?preset=week" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Shop admins can filter by `shopId`:

```bash
curl -s "$BASE_URL/api/reports/orders?preset=month&shopId=$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Export order report (Excel / PDF)

```bash
curl -s -o orders-week.xlsx "$BASE_URL/api/reports/orders/export?preset=week&format=xlsx" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -s -o orders-week.pdf "$BASE_URL/api/reports/orders/export?preset=week&format=pdf" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Shop store info (admin)

Get:

```bash
curl -s "$BASE_URL/api/shops/my/$SHOP_ID/store-info" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Update (hours, weekly off days, accepting orders flag):

```bash
curl -s -X PUT "$BASE_URL/api/shops/my/$SHOP_ID/store-info" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "openTime": "09:00",
    "closeTime": "21:00",
    "weeklyOffDays": [0],
    "acceptingOrders": true
  }' | jq .
```

---

## Shop offers (admin)

List:

```bash
curl -s "$BASE_URL/api/shops/my/$SHOP_ID/offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Create (multipart — optional banner image):

```bash
curl -s -X POST "$BASE_URL/api/shops/my/$SHOP_ID/offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "title=10% off sweets" \
  -F "discountType=Percentage" \
  -F "discountValue=10" \
  -F "isActive=true" | jq .
```

Update:

```bash
curl -s -X PATCH "$BASE_URL/api/shops/my/$SHOP_ID/offers/$OFFER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "title=15% off sweets" \
  -F "discountValue=15" | jq .
```

Delete:

```bash
curl -s -X DELETE "$BASE_URL/api/shops/my/$SHOP_ID/offers/$OFFER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Platform offers (super admin)

```bash
curl -s "$BASE_URL/api/admin/platform-offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

curl -s -X POST "$BASE_URL/api/admin/platform-offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "title=Free delivery weekend" \
  -F "discountType=Flat" \
  -F "discountValue=50" \
  -F "isActive=true" | jq .

curl -s -X PATCH "$BASE_URL/api/admin/platform-offers/$OFFER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "isActive=false" | jq .

curl -s -X DELETE "$BASE_URL/api/admin/platform-offers/$OFFER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Platform announcements (super admin)

```bash
curl -s "$BASE_URL/api/admin/announcements" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

curl -s -X POST "$BASE_URL/api/admin/announcements" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Scheduled maintenance",
    "body": "API will be down tonight 2–3 AM",
    "audience": "Shopkeepers",
    "isActive": true,
    "sendNotification": true
  }' | jq .

curl -s -X PATCH "$BASE_URL/api/admin/announcements/$ANNOUNCEMENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}' | jq .

curl -s -X DELETE "$BASE_URL/api/admin/announcements/$ANNOUNCEMENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

`audience`: `Customers`, `Shopkeepers`, or `All`.
