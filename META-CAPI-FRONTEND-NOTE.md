# Meta Conversions API (CAPI) — Frontend Integration Note

The backend now sends a server-side **Purchase** event to Meta Conversions API
immediately after an **online** payment is confirmed (Razorpay verify /
webhook / status sync). Nothing changes on your side functionally — your
existing browser Pixel `Purchase` event keeps firing as-is. We only need **one
small addition** so Meta can deduplicate the two events instead of counting
the purchase twice.

## 1. Use a matching `eventID` on the Pixel Purchase event

When you fire the Pixel Purchase event on the order confirmation page, set
`eventID` to:

```
purchase_order_<orderNumber>
```

Example (orderNumber `AARA-0001`):

```js
fbq(
  "track",
  "Purchase",
  {
    value: order.totalAmount,
    currency: "INR",
    content_ids: order.items.map((i) => String(i.variantId)),
    content_type: "product",
  },
  { eventID: `purchase_order_${order.orderNumber}` },
);
```

That's the **only required change**. The backend independently derives the
exact same ID (`purchase_order_<orderNumber>`) when it sends its own
server-side event, so the two events will automatically dedupe in Meta Events
Manager without any extra API calls from you.

> If you'd rather generate your own event ID (e.g. a uuid) instead of using
> this convention, that also works — just send it as `metaEventId` in the
> `/payments/razorpay/verify` request body (see step 2) and the backend will
> use your ID instead of the default.

## 2. (Optional but recommended) Send a few extra fields on verify

To improve Meta's **Event Match Quality** score for the server-side event,
include these optional fields in the existing
`POST /payments/razorpay/verify` call right after Razorpay's checkout
`handler` succeeds:

```json
{
  "orderId": 3,
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "xxx",

  "metaEventId": "purchase_order_AARA-0003",
  "fbp": "<value of the _fbp cookie>",
  "fbc": "<value of the _fbc cookie, or derived from the fbclid query param>",
  "eventSourceUrl": "https://aaraahomecare.com/order-confirmation/AARA-0003"
}
```

All four fields are optional — omitting them does not break anything, it just
lowers the match quality score slightly. `metaEventId` only needs to be sent
if you're **not** using the `purchase_order_<orderNumber>` convention from
step 1.

- `_fbp` / `_fbc` — standard Meta Pixel first-party cookies, read with
  `document.cookie` (e.g. via a small cookie-reader helper or `js-cookie`).
- `eventSourceUrl` — just `window.location.href` on the confirmation page.

## What you do NOT need to do

- No frontend code talks to Meta's Graph API directly.
- No access token or Pixel/Dataset ID is ever exposed in frontend code — that
  stays server-side only.
- COD orders are unaffected — this is online-payment-only, and nothing
  changes about how/when you fire the Pixel event for COD (keep doing
  whatever you already do there, if anything).

## How to verify together

1. Backend will set a Meta **Test Events** code temporarily.
2. Do a real test checkout (Razorpay test mode) end-to-end as you normally
   would, making sure you send the matching `eventID` per step 1.
3. Open **Meta Events Manager → Test Events** — you should see **two**
   `Purchase` events (Browser + Server) for the same test, and Meta should
   mark them **"Deduplicated"**.
4. If they show as two *separate* (non-deduplicated) events, double-check the
   `eventID` sent by the Pixel matches exactly what the backend expects
   (`purchase_order_<orderNumber>`, case-sensitive).

Questions → ping the backend dev (Sarmi's team) with the order number + a
screenshot of Test Events if dedup isn't matching.
