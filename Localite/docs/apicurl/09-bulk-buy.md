# Bulk Buy (v0.11)

Group buying for big-ticket electronics (fridges, TVs, washing machines, etc.). Separate from regular grocery orders — use `/api/bulk-buy/*`.

**Prerequisites:** Customer or store admin must be onboarded. Stores need `bulkBuyEnabled: true` (super admin sets via `PATCH /api/admin/shops/:shopId`).

Product categories: `refrigerator`, `washing_machine`, `television`, `mobile`, `air_conditioner`, `other`

Campaign statuses: `collecting` → `ready_for_offers` → `offers_available` → `closed` / `expired` / `cancelled`

---

## Enable shop as bulk partner (super admin)

```bash
curl -s -X PATCH "$BASE_URL/api/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bulkBuyEnabled": true}' | jq .
```

---

## List campaigns in area

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns?areaId=$AREA_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Uses the logged-in user's `areaId` when `areaId` query param is omitted.

---

## Create campaign (customer)

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

`minSubscribers` defaults to **10** (minimum 2). Save `campaign.id` as `CAMPAIGN_ID`.

---

## Create campaign (bulk-enabled store)

Requires `shopId` for a shop with `bulkBuyEnabled: true`.

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

## Get campaign detail

Includes subscriber count, offers, and `isSubscribed` for the current customer.

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

When `subscriberCount >= minSubscribers`, status becomes `ready_for_offers` and bulk partner stores in the area are notified.

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

Returns campaigns created by the customer or by the store admin's shop(s).

---

## Store inbox (bulk partner)

Campaigns at threshold, ready for store offers.

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns/inbox" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

Requires **admin** or **super_admin** role and a `bulkBuyEnabled` shop in the campaign's area.

---

## List offers for a campaign

```bash
curl -s "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## Submit store offer

When campaign status is `ready_for_offers` or `offers_available`. All current subscribers receive a push notification.

```bash
curl -s -X POST "$BASE_URL/api/bulk-buy/campaigns/$CAMPAIGN_ID/offers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"shopId\": \"$SHOP_ID\",
    \"discountType\": \"percent\",
    \"discountValue\": 12,
    \"termsText\": \"Valid when all interested buyers purchase within 30 days at our branch.\",
    \"extras\": {
      \"extendedWarrantyMonths\": 12,
      \"freebies\": \"Free mixer grinder\",
      \"installation\": true
    },
    \"validUntil\": \"2026-09-30T00:00:00.000Z\"
  }" | jq .
```

`discountType`: `percent`, `flat`, or `text`. One offer per shop per campaign (resubmit updates the existing offer).

---

## Bulk buy flow summary

```
Customer or store creates campaign
  → Customers subscribe (interest)
  → Threshold reached → ready_for_offers
  → Bulk partner stores submit offers
  → Subscribers notified → view offers in app
  → Purchase at store (out of app for MVP)
```
