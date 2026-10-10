# Razorpay Payment Flow

Base URL: `http://localhost:3030`

All protected endpoints require:
```
Authorization: Bearer <token>
```

---

## Step 1 — Register Customer

**POST** `/customers/register`

```json
{
  "name": "Test Customer",
  "email": "test@example.com",
  "phone": "+919999999999",
  "password": "Test@123456"
}
```

---

## Step 2 — Login Customer

**POST** `/customers/login`

```json
{
  "email": "test@example.com",
  "password": "Test@123456"
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbGciOi...",
    "customerId": 1,
    "name": "Test Customer"
  }
}
```

Save the `token` — use it as `Bearer <token>` in all further requests.

---

## Step 3 — Add Item to Cart

**POST** `/cart/add`

```json
{
  "productId": 1,
  "variantId": 1,
  "quantity": 1
}
```

---

## Step 4 — (Optional) Checkout Summary

**GET** `/checkout/summary`

Returns server-calculated total, tax, shipping and any coupon discount before placing the order.

---

## Step 5 — Place Order

**POST** `/checkout/place-order`

```json
{
  "addressId": 1,
  "paymentMethod": "UPI"
}
```

> `paymentMethod` must be one of: `CARD`, `UPI`, `NETBANKING` (for online), or `COD`.

**Response:**
```json
{
  "data": {
    "id": 3,
    "orderNumber": "ORD-1219196034f44b8f",
    "totalAmount": "225.82",
    "paymentStatus": "pending"
  }
}
```

Save the `id` (Order ID) — needed in the next step.

---

## Step 6 — Create Razorpay Order

**POST** `/payments/razorpay/create-order`

```json
{
  "orderId": 3
}
```

**Response:**
```json
{
  "data": {
    "razorpayOrderId": "order_SepaFQGMX1qJZY",
    "amount": 22582,
    "currency": "INR",
    "keyId": "rzp_test_J2JHEtiAsG6guq",
    "orderNumber": "ORD-1219196034f44b8f"
  }
}
```

---

## Step 7 — Open Razorpay Checkout (Frontend)

Use the values from Step 6 in the Razorpay Checkout JS on your frontend:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```js
const options = {
  key: "rzp_test_J2JHEtiAsG6guq",        // keyId from Step 6
  amount: 22582,                           // amount in paise from Step 6
  currency: "INR",
  name: "Your Store Name",
  description: "Order ORD-1219196034f44b8f",
  order_id: "order_SepaFQGMX1qJZY",       // razorpayOrderId from Step 6
  handler: function (response) {
    // Call Step 8 with these values
    console.log(response.razorpay_order_id);
    console.log(response.razorpay_payment_id);
    console.log(response.razorpay_signature);
  },
  prefill: {
    name: "Test Customer",
    email: "test@example.com",
    contact: "+919999999999"
  },
};
const rzp = new Razorpay(options);
rzp.open();
```

---

## Step 8 — Verify Payment

After the user completes payment, Razorpay calls `handler` with the signature. Send it to the backend:

**POST** `/payments/razorpay/verify`

```json
{
  "orderId": 3,
  "razorpayOrderId": "order_SepaFQGMX1qJZY",
  "razorpayPaymentId": "pay_xxxxxxxxxxxxxxx",
  "razorpaySignature": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Response (success):**
```json
{
  "data": {
    "success": true,
    "payment": {
      "id": 1,
      "orderId": 3,
      "paymentMethod": "razorpay",
      "transactionId": "pay_xxxxxxxxxxxxxxx",
      "paymentStatus": "paid"
    }
  }
}
```

Order `paymentStatus` is updated to `paid` and stock is confirmed.

---

## Step 9 — (Recovery) Sync status if verify was skipped

If Checkout closed early or `handler` never ran, poll:

**GET** `/payments/razorpay/status/:orderId`

```json
{
  "data": {
    "orderId": 3,
    "paymentStatus": "pending",
    "razorpayOrderId": "order_SepaFQGMX1qJZY",
    "razorpayOrderStatus": "created",
    "razorpayPaymentStatus": "unprocessed",
    "synced": false,
    "message": "Payment not completed at Razorpay yet..."
  }
}
```

- `razorpayPaymentStatus: "unprocessed"` = money was **not** captured (QR abandoned, invalid UPI VPA, or **website whitelist block**).
- If Razorpay already captured payment, this endpoint marks the shop order `paid` (`synced: true`).

Optional health: **GET** `/payments/razorpay/config`

Webhook (Dashboard → Webhooks → `payment.captured` / `order.paid`):  
**POST** `/payments/razorpay/webhook` with `RAZORPAY_WEBHOOK_SECRET`.

---

## Troubleshooting (live Checkout)

| Error / symptom | Cause | Fix |
|-----------------|-------|-----|
| `Payment blocked as website does not match registered website(s)` | Live key + Checkout opened from a host not listed on the Razorpay account | Razorpay Dashboard → **Account & Settings → Website and app settings** → add exact storefront URL(s) (`https://aaraahomecare.com`, `https://www.aaraahomecare.com`, staging if needed). www vs non-www must match. |
| `Invalid VPA` / `invalid_vpa` | Customer typed a bad UPI id | UPI must look like `name@bank` (e.g. `user@okaxis`). Not an API bug. |
| QR / Checkout `status: "unprocessed"` | Payment never completed at Razorpay | Fix whitelist / complete UPI; then call **verify** or **GET status** sync. |
| Shop order stuck `pending` after successful pay | Frontend did not call `/payments/razorpay/verify` | Call verify from `handler`, or poll status sync / enable webhook. |

> **Security:** Never commit live key secrets. If a live `key_id` / secret was shared in browser logs or chat, rotate keys in the Razorpay Dashboard.

---

## Available Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/payments/razorpay/config` | Live/test mode + whitelist hint |
| `POST` | `/payments/razorpay/create-order` | Create a Razorpay order (Step 6) |
| `POST` | `/payments/razorpay/verify` | Verify signature & mark order paid (Step 8) |
| `GET` | `/payments/razorpay/status/:orderId` | Poll/sync gateway status (Step 9) |
| `POST` | `/payments/razorpay/webhook` | Public webhook (`payment.captured`) |
| `GET` | `/payments/order/:orderId` | Get all payments for an order |
| `GET` | `/payments/:id` | Get a single payment by ID |

---

## Full Flow Summary

```
POST /customers/register               → create account
POST /customers/login                  → get token
POST /cart/add                         → add product to cart
GET  /checkout/summary                 → (optional) see totals
POST /checkout/place-order             → create order → get orderId
POST /payments/razorpay/create-order   → get razorpayOrderId + keyId
     [Razorpay Checkout JS on frontend — domain must be whitelisted for live]
POST /payments/razorpay/verify         → confirm payment → order marked paid
GET  /payments/razorpay/status/:id     → recovery if verify skipped
```

---

## Test Credentials (Development Only)

| Field    | Value                          |
|----------|-------------------------------|
| Email    | test.customer@ecom.local       |
| Password | Test@123456                    |
| Key ID   | rzp_test_J2JHEtiAsG6guq        |

Seed test data: `pnpm run db:seed:test`  
Run flow test:  `node scripts/test-razorpay-flow.js`
