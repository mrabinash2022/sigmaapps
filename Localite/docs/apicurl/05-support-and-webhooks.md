# Support & Webhooks

## Create support ticket (customer)

Issue types: `Delivery_Instruction`, `Wrong_Item`, `Damaged_Product`, `Delayed_Delivery`, `Other`

```bash
curl -s -X POST "$BASE_URL/api/support/create-ticket" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"issueType\": \"Wrong_Item\",
    \"customerMessage\": \"Received wrong item in my order\"
  }" | jq .
```

---

## List my tickets (customer)

```bash
curl -s "$BASE_URL/api/support/my" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## List active tickets for shop (admin / super admin)

```bash
curl -s "$BASE_URL/api/support/merchant/active/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Update ticket (admin / super admin)

Status flow: `Open` → `Acknowledged` → `Resolved`

```bash
curl -s -X PATCH "$BASE_URL/api/support/update-ticket/$TICKET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketStatus": "Acknowledged",
    "shopkeeperResolution": "We will send a replacement tomorrow"
  }' | jq .
```

Resolve:

```bash
curl -s -X PATCH "$BASE_URL/api/support/update-ticket/$TICKET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketStatus": "Resolved",
    "shopkeeperResolution": "Replacement delivered"
  }' | jq .
```

---

## Razorpay webhook

Called by Razorpay servers (not for manual testing without valid signature).

```bash
curl -s -X POST "$BASE_URL/api/webhooks/razorpay" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <signature>" \
  -d '{
    "event": "payment.captured",
    "payload": {}
  }'
```

> Requires `RAZORPAY_WEBHOOK_SECRET` in `apps/api/dev.local`. Use Razorpay dashboard or CLI for real webhook testing.
