# Meta Conversions API frontend integration

Use Pixel ID `4653538934931886` in the browser. The access token stays on the
backend. The frontend must implement the browser events; this repository
contains only the backend.

## Purchase

Fire the browser Pixel Purchase only after a confirmed COD order or a captured
online payment, using the order number returned by the backend:

```js
fbq("track", "Purchase", {
  value: order.totalAmount,
  currency: "INR",
  content_ids: order.items.map((item) => String(item.variantId)),
  content_type: "product",
}, { eventID: `purchase_order_${order.orderNumber}` });
```

The server uses the same ID even when a Razorpay webhook or status sync arrives
before the browser's verify request. Do not generate a custom Purchase ID.
If sent to `/payments/razorpay/verify`, `metaEventId` must match this ID.
Optional `fbp`, `fbc`, and `eventSourceUrl` on verify improve match quality
when verify confirms payment first.

## AddToCart and InitiateCheckout

Generate a unique ID per browser event, use it as Pixel `eventID`, and pass
the same value as `metaEventId` with the API call:

* `POST /cart/add`: alongside `productId`, `variantId`, and `quantity`.
* `POST /checkout/place-order`: alongside the usual order fields. The server
  sends InitiateCheckout when place-order is called, not when checkout opens.

Both requests also accept optional `fbp` (`_fbp` cookie), `fbc` (`_fbc`
cookie), and `eventSourceUrl` (the page URL). Fire the corresponding browser
event once per action with the same event name and ID.

Server AddToCart and InitiateCheckout are disabled unless a Meta test event code
is set or `META_CAPI_COMMERCE_EVENTS_ENABLED=true`. After testing, enable the
flag in production and remove the test code.

## Verification

Use an isolated test environment, set its `META_CAPI_TEST_EVENT_CODE` to the
code in Events Manager's Test Events, and restart that API. Exercise add to
cart, checkout, captured online payment, and confirmed COD. Inspect Browser
and Server events in Test Events, checking the same event name and ID and
Meta's deduplication status. Do not use fake orders in the production dataset.
Production activation and actual deduplication require this end-to-end check;
matching IDs alone do not prove Meta deduplicated the events.
Razorpay test-mode payments are not sent without a test event code. COD has no
gateway test-mode marker, so test COD orders only in an isolated environment.
