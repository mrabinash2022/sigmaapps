# Addresses, Wishlist, Ratings & Analytics

## Saved addresses

List:

```bash
curl -s "$BASE_URL/api/addresses" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Create:

```bash
curl -s -X POST "$BASE_URL/api/addresses" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"label\": \"Home\",
    \"address\": \"Flat 12, Roseland Residency, Pimple Saudagar\",
    \"areaId\": \"$AREA_ID\",
    \"latitude\": 18.5912,
    \"longitude\": 73.7849,
    \"isDefault\": true
  }" | jq .
```

Update:

```bash
curl -s -X PATCH "$BASE_URL/api/addresses/$ADDRESS_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Office",
    "address": "Tech Park, Hinjewadi",
    "isDefault": true
  }' | jq .
```

Delete:

```bash
curl -s -X DELETE "$BASE_URL/api/addresses/$ADDRESS_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Wishlist (customer)

List saved products:

```bash
curl -s "$BASE_URL/api/wishlist" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

List catalog item IDs (optional `shopId` filter):

```bash
curl -s "$BASE_URL/api/wishlist/ids?shopId=$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Add:

```bash
curl -s -X POST "$BASE_URL/api/wishlist" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"catalogItemId\": \"$ITEM_ID\"}" | jq .
```

Remove:

```bash
curl -s -X DELETE "$BASE_URL/api/wishlist/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Order ratings (customer)

Rate a delivered order (1–5 stars):

```bash
curl -s -X POST "$BASE_URL/api/ratings/orders/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Fresh flowers, on-time delivery"
  }' | jq .
```

Get rating for an order:

```bash
curl -s "$BASE_URL/api/ratings/orders/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Shop list responses include `avgRating` and `ratingCount` when ratings exist.

---

## Platform analytics (super admin)

```bash
curl -s "$BASE_URL/api/analytics/platform?days=30" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Shop insights (admin / super admin)

```bash
curl -s "$BASE_URL/api/analytics/shop/$SHOP_ID?days=30" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Returns revenue, order counts, top products, and rating summary for the shop.
