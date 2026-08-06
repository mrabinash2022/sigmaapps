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

```bash
curl -s -X PATCH "$BASE_URL/api/orders/transition/accept/$ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "finalBillAmount": 450,
    "deliveryTimeWindow": "Today 6-8 PM"
  }' | jq .
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

## Order flow summary

```
Created → Accept (shop) → Select payment (customer) → Pay (UPI mock/real) → Ship (shop) → Deliver
```

For Cash on Delivery, skip pay step after select-payment.
