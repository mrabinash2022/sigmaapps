# Orders

Requires appropriate role tokens. Customer must be onboarded to place orders.

## Submit order (text list)

Customer token required.

```bash
curl -s -X POST "$BASE_URL/api/orders/submit-flexible-order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "shopId=$SHOP_ID" \
  -F "textPayload=2kg rice, 1L oil, 500g sugar" | jq .
```

---

## Submit order (image upload)

```bash
curl -s -X POST "$BASE_URL/api/orders/submit-flexible-order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "shopId=$SHOP_ID" \
  -F "image=@/path/to/order-photo.jpg" | jq .
```

---

## Submit visual / catalog order

For shops with visual catalog enabled. JSON body (no image):

```bash
curl -s -X POST "$BASE_URL/api/orders/submit-catalog-order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"shopId\": \"$SHOP_ID\",
    \"items\": [
      {
        \"catalogItemId\": \"$ITEM_ID\",
        \"name\": \"Red Rose Bouquet\",
        \"quantity\": 2,
        \"unitPrice\": 299
      }
    ],
    \"note\": \"Deliver by 6 PM\"
  }" | jq .
```

With extra text and/or photo (multipart):

```bash
curl -s -X POST "$BASE_URL/api/orders/submit-catalog-order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "shopId=$SHOP_ID" \
  -F 'items=[{"catalogItemId":"'"$ITEM_ID"'","name":"Red Rose Bouquet","quantity":1,"unitPrice":299}]' \
  -F "extraText=Also add a greeting card" \
  -F "note=Deliver by evening" \
  -F "image=@/path/to/handwritten-list.jpg" | jq .
```

---

## Reorder (customer)

Creates a new order from a previously delivered order.

```bash
curl -s -X POST "$BASE_URL/api/orders/reorder/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## List my orders (customer)

```bash
curl -s "$BASE_URL/api/orders/my" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## List shop orders (admin / super admin)

```bash
curl -s "$BASE_URL/api/orders/shop/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Get order by ID

```bash
curl -s "$BASE_URL/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Accept order (shop admin)

Shop must be **enabled**. Sets bill amount and delivery window.

Simple accept (full fulfillment):

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/accept/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "finalBillAmount": 450,
    "deliveryTimeWindow": "Today 6-8 PM"
  }' | jq .
```

Partial fulfillment with optional backorder child order:

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/accept/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "finalBillAmount": 380,
    "deliveryTimeWindow": "Today 6-8 PM",
    "createBackorder": true,
    "fulfillment": {
      "shopNote": "Rice is out of stock — rest will follow",
      "lines": [
        {
          "key": "catalog-0",
          "kind": "catalog",
          "name": "Basmati Rice 5kg",
          "catalogItemId": "uuid-here",
          "quantityRequested": 2,
          "quantityFulfilled": 1,
          "unitPrice": 120,
          "status": "partial",
          "unavailableReason": "Only 1 bag in stock"
        },
        {
          "key": "catalog-1",
          "kind": "catalog",
          "name": "Sunflower Oil 1L",
          "catalogItemId": "uuid-here",
          "quantityRequested": 1,
          "quantityFulfilled": 0,
          "unitPrice": 140,
          "status": "unavailable",
          "unavailableReason": "Out of stock"
        }
      ]
    }
  }' | jq .
```

Line `status` values: `fulfilled`, `partial`, `unavailable`.

---

## Mark backorder ready (shop admin)

For child orders in `Backorder_Waiting` status.

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/backorder-ready/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "finalBillAmount": 260,
    "deliveryTimeWindow": "Tomorrow 10 AM - 12 PM"
  }' | jq .
```

---

## Reject order (shop admin)

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/reject/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Shop closed for the day"}' | jq .
```

---

## Select payment method (customer)

Payment methods: `UPI_Instant`, `Cash_On_Delivery`

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/select-payment/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "Cash_On_Delivery"}' | jq .
```

UPI:

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/select-payment/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "UPI_Instant"}' | jq .
```

---

## Create Razorpay order (customer — production)

Only when Razorpay is configured in env.

```bash
curl -s -X POST "$BASE_URL/api/orders/transition/create-razorpay-order/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Verify Razorpay payment (customer)

```bash
curl -s -X POST "$BASE_URL/api/orders/transition/verify-payment/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpayOrderId": "order_xxx",
    "razorpayPaymentId": "pay_xxx",
    "razorpaySignature": "signature_xxx"
  }' | jq .
```

---

## Mock pay (customer — dev only)

Use when Razorpay is **not** configured. Order must have `UPI_Instant` selected.

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/pay/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Ship order (shop admin)

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/ship/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Mark delivered (customer or shop admin)

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/deliver/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Return order (customer)

After delivery. Sets `Refund_Pending` when a paid UPI order is returned.

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/return/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Wrong items received"}' | jq .
```

---

## Process refund (shop admin / super admin)

For returned orders with `Refund_Pending` payment status.

```bash
curl -s -X POST "$BASE_URL/api/orders/transition/refund/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Uses Razorpay refund when configured; otherwise marks refunded in dev.

---

## Order flow summary

```
Created
  → Accept (shop) [optional: partial + backorder child]
  → Backorder_Waiting → backorder-ready (shop) → Accepted
  → Select payment (customer)
  → Pay (UPI mock/real) OR skip for COD
  → Ship (shop)
  → Deliver
  → Return (customer) → Refund (shop, if paid)
```

Reject is available from `Created`. Cash on Delivery skips the pay step after select-payment.
