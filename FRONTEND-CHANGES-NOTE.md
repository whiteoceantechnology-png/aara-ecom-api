# Backend Update — Frontend Changes Note

**No frontend change is required today.** Existing behaviour is unchanged.
Sections 2–3 are new optional fields; section 1 is advance notice.

## 1. Access checks — no change today, please verify before we enforce

The backend now has ownership and admin-only checks, but they currently run in
**report-only mode**: nothing is blocked, every request behaves exactly as
before, and the backend only logs requests that would be refused. We will turn
blocking on later, after you confirm the points below.

**Admin panel** — these storefront routes will require the admin token from
`POST /admin/auth/login`:

- `POST`, `PUT`, `DELETE` on `/products`, `/categories`, `/taxes`
- `POST /product/specification/:id`
- `PUT /orders/:id/status`

**Website** — these routes will only allow the logged-in customer's own data
(admin tokens can access any ID):

- `GET /cart/:customerId` — use the customer ID from the login response
- `GET /customers/:id`, `POST /customers/update/:id`, `POST /auth/update/:id`
- `PATCH /auth/update/:id` and `/user/:id/...` — the logged-in user's own ID
- `/payments/razorpay/create-order`, `/payments/razorpay/status/:orderId`,
  `/payments/order/:orderId`, `/payments/:id` — only that customer's orders
- `PUT /cart/update`, `DELETE /cart/remove/:cartItemId` — only items in the
  logged-in customer's cart

Normal use already follows these rules. Once enforced, a violation returns
**403** (404 for cart items), so please show a friendly message for 403.

## 2. Admin create forms — new optional fields

- `POST /admin/categories` accepts `isActive` (it returned a 400 before)
- Create brand accepts `isActive`
- Create product accepts `status`

All three default to active when left out.

## 3. Meta tracking — browser and server use the same event ID

- `POST /cart/add`: send `metaEventId`, `fbp`, `fbc`, `eventSourceUrl`.
  `metaEventId` must equal the Pixel AddToCart `eventID`.
- `POST /checkout/place-order`: send the same four fields. `metaEventId` must
  equal the Pixel InitiateCheckout `eventID`.
- `POST /payments/razorpay/verify`: send `metaEventId` as
  `purchase_order_<orderNumber>`, plus `fbp`, `fbc`, `eventSourceUrl`.
- Do not call `/checkout/initiate-checkout` — it has been removed.

## 4. Coming soon — password reset flow will change

`forgot-password` will stop returning the reset token in its response. The
token will be emailed as a link instead, and the reset page will send it back.
Details will follow; no change needed yet.

## Test checklist on api-dev

- **Admin:** save a product, category, tax, and specification; change an order
  status; open a customer's details.
- **Website:** log in, add to cart, update and remove an item, check out, and
  pay with Razorpay.

Nothing should return 403 yet. If anything behaves differently from before,
report it with the request URL and which login was used.
