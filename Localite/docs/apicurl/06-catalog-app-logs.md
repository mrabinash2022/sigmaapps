# Catalog management, App info & Logging

Shopkeeper catalog routes require **admin** role and shop access.

## Get shop catalog (public — customer browse)

```bash
curl -s "$BASE_URL/api/shops/$SHOP_ID/catalog" | jq .
```

Returns `groups`, `items`, and `visualCatalogEnabled` for published products.

---

## Manage catalog (shop admin)

```bash
curl -s "$BASE_URL/api/shops/my/$SHOP_ID/catalog/manage" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Create catalog item

```bash
curl -s -X POST "$BASE_URL/api/shops/my/$SHOP_ID/catalog/items" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "name=Red Rose Bouquet" \
  -F "itemGroup=flowers" \
  -F "price=299" \
  -F "unit=piece" \
  -F "publish=true" \
  -F "image=@/path/to/product.jpg" | jq .
```

---

## Update catalog item

```bash
curl -s -X PATCH "$BASE_URL/api/shops/my/$SHOP_ID/catalog/items/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "name=Updated name" \
  -F "price=349" | jq .
```

---

## Publish / unpublish item

```bash
curl -s -X PATCH "$BASE_URL/api/shops/my/$SHOP_ID/catalog/items/$ITEM_ID/publish" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

curl -s -X PATCH "$BASE_URL/api/shops/my/$SHOP_ID/catalog/items/$ITEM_ID/unpublish" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Delete catalog item

```bash
curl -s -X DELETE "$BASE_URL/api/shops/my/$SHOP_ID/catalog/items/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Enable / disable visual catalog for shop

Requires at least one published product to enable.

```bash
curl -s -X PATCH "$BASE_URL/api/shops/my/$SHOP_ID/visual-catalog" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' | jq .
```

---

## App info (authenticated)

Contact, about, and referral defaults for the mobile profile screen.

```bash
curl -s "$BASE_URL/api/app/info" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Send app referral invite

```bash
curl -s -X POST "$BASE_URL/api/app/refer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "email": "friend@example.com"
  }' | jq .
```

Provide `phone` and/or `email`. At least one is required.

---

## Submit mobile client logs

Optional auth — attaches `userId` when a valid token is sent. Rate-limited.

```bash
curl -s -X POST "$BASE_URL/api/logs/client" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "level": "info",
        "message": "Screen mounted",
        "platform": "android",
        "appVersion": "0.1.0",
        "meta": { "screen": "Profile" }
      }
    ]
  }' | jq .
```

With auth:

```bash
curl -s -X POST "$BASE_URL/api/logs/client" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "level": "error",
        "message": "API request failed",
        "meta": { "path": "/api/orders/my", "status": 500 }
      }
    ]
  }' | jq .
```

Logs are written to `docs/logging/frontend/client-YYYY-MM-DD.log`.
