# Bulk Buy (v0.12)

Group buying for big-ticket electronics (fridges, TVs, washing machines, etc.). Separate from regular grocery orders — use `/api/bulk-buy/*`.

**Prerequisites:** Customer or store admin must be onboarded. Stores need `bulkBuyEnabled: true` (super admin sets via `PATCH /api/admin/shops/:shopId`). Customers always have bulk buy access; only shopkeepers are gated by this flag.

Product categories: `refrigerator`, `washing_machine`, `television`, `mobile`, `air_conditioner`, `other`

### Campaign statuses

```
collecting → ready_for_offers → offers_available → closed | expired | cancelled
```

### Commitment statuses (per subscriber, after accepting a store offer)

`accepted` → `token_pending` → `token_paid` → `visit_scheduled` → `completed`

---

## Enable shop as bulk partner (super admin)

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bulkBuyEnabled": true}' | jq .
```

## Disable bulk buy for a shop

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bulkBuyEnabled": false}' | jq .
```

## Verify flag on shopkeeper profile

```bash
curl -s "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.user.shops[] | {id, name, bulkBuyEnabled}'
```

---

## Super admin: platform settings

Defaults: `collectionPeriodDays` **7**, `defaultMinSubscribers` **10**, `autoCloseGraceDaysAfterDealDay` **3**.

```bash
curl -s "$BASE_URL/api/admin/bulk-buy-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

curl -s -X PATCH "$BASE_URL/api/admin/bulk-buy-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"collectionPeriodDays": 7, "defaultMinSubscribers": 10, "autoCloseGraceDaysAfterDealDay": 3}' | jq .
```

Campaigns in `collecting` with `subscriberCount < minSubscribers` after `deadlineAt` are auto-set to `expired`.

---

## List campaigns in area

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns?areaId=$AREA_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Create campaign (customer)

`deadlineAt` is set automatically from `collectionPeriodDays` when omitted.

```bash
curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Bulk buy refrigerator — Roseland\",
    \"productCategory\": \"refrigerator\",
    \"brandPreference\": \"LG\",
    \"description\": \"7-star inverter, 260L+\",
    \"minSubscribers\": 10,
    \"areaId\": \"$AREA_ID\"
  }" | jq .
```

Save `campaign.id` as `CAMPAIGN_ID`.

---

## Create campaign (bulk-enabled store)

```bash
curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Chroma bulk TV fest\",
    \"productCategory\": \"television\",
    \"description\": \"55 inch smart TVs\",
    \"minSubscribers\": 10,
    \"shopId\": \"$SHOP_ID\",
    \"areaId\": \"$AREA_ID\"
  }" | jq .
```

---

## Edit campaign (creator, collecting only)

```bash
curl -s -X PATCH "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bulk buy refrigerator — updated",
    "description": "Prefer double-door 300L",
    "minSubscribers": 10
  }' | jq .
```

---

## Get campaign detail

Includes `offers`, `myCommitment`, `visitPollDates`, `pollVoteSummary`, `acceptanceCount` per offer.

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Subscribe / show interest (customer)

```bash
curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/subscribe" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

When `subscriberCount >= minSubscribers`, status becomes `ready_for_offers`.

---

## Unsubscribe (customer)

Only while campaign is still `collecting`.

```bash
curl -s -X DELETE "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/subscribe" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## List my created campaigns

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns/mine" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Store inbox (bulk partner)

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns/inbox" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## List offers for a campaign

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Submit store offer

**Required:** `tokenAmount` (₹ booking token, `0` for none) and `proposedDealDay` (`YYYY-MM-DD`).

Each store can proceed with however many customers accept (e.g. 5 of 10 to Vijay Sales, 4 of 10 to Croma).

```bash
curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"shopId\": \"$SHOP_ID\",
    \"discountType\": \"percent\",
    \"discountValue\": 12,
    \"tokenAmount\": 99,
    \"proposedDealDay\": \"2026-08-16\",
    \"termsText\": \"Valid when buyers visit on confirmed deal day.\",
    \"extras\": {
      \"extendedWarrantyMonths\": 12,
      \"freebies\": \"Free mixer grinder\",
      \"installation\": true
    },
    \"validUntil\": \"2026-09-30T00:00:00.000Z\"
  }" | jq .
```

Save `offer.id` as `OFFER_ID`. One offer per shop per campaign (resubmit updates).

---

## Accept store offer (customer)

One store per campaign. Must be subscribed first.

```bash
curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/offers/$OFFER_ID/accept" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Withdraw offer commitment (customer)

Only before token payment.

```bash
curl -s -X DELETE "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/commitment" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Pay booking token

### Dev mock (Razorpay not configured)

```bash
curl -s -X PATCH "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/commitment/mock-pay-token" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### Razorpay

```bash
curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/commitment/token-order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/commitment/verify-token" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpayOrderId": "order_xxx",
    "razorpayPaymentId": "pay_xxx",
    "razorpaySignature": "signature_xxx"
  }' | jq .
```

---

## Visit day poll

Creator sets poll dates; subscribers vote. When the **top-voted poll date** matches a store's `proposedDealDay`, that offer gets `confirmedDealDay` and acceptors move to `visit_scheduled`.

```bash
curl -s -X PATCH "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/visit-poll" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visitPollDates": ["2026-08-16", "2026-08-23", "2026-08-30"]}' | jq .

curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/visit-poll/vote" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pollDate": "2026-08-16"}' | jq .
```

---

## List store commitments

Store admin or campaign creator.

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/offers/$OFFER_ID/commitments" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Mark commitment complete

Store admin marks a customer as purchased; customer can self-mark when allowed.

```bash
curl -s -X PATCH "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/commitments/$PARTICIPANT_ID/complete" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Close campaign

Creator or store admin with an offer on the campaign.

```bash
curl -s -X PATCH "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/close" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "deal_complete"}' | jq .
```

Auto-close: after `confirmedDealDay` + `autoCloseGraceDaysAfterDealDay` when all stores with acceptances have passed their deal day.

---

## Full flow summary (v0.12)

```
1. Super admin enables bulkBuyEnabled on partner stores
2. Customer creates campaign → others subscribe → threshold reached
3. Stores submit offers (discount + tokenAmount + proposedDealDay)
4. Each customer accepts ONE store offer → pays booking token
5. Creator sets visit poll → subscribers vote
6. Winning poll date matching store proposed day → confirmed visit day
7. Store sees commitments → customers visit → mark complete
8. Campaign closed manually or auto-closed after deal day grace period
```

Automated API coverage: `apps/api/tests/bulkBuy.test.js`
