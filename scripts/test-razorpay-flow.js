/**
 * End-to-end Razorpay payment flow test script.
 *
 * What this script does:
 *   1. Seeds test data (customer, product, variant, cart, address)
 *   2. Logs in as the test customer
 *   3. Adds the test variant to cart (idempotent)
 *   4. Places an order (ONLINE payment method)
 *   5. Creates a Razorpay order for that DB order
 *
 * Run: node scripts/test-razorpay-flow.js
 * Requires the API server to be running on PORT (default 3030).
 */
require("dotenv/config");

const BASE_URL = `http://localhost:${process.env.PORT ?? 3030}`;

const CUSTOMER_EMAIL = "test.customer@ecom.local";
const CUSTOMER_PASSWORD = "Test@123456";

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

function ok(label, res) {
  const pass = res.status >= 200 && res.status < 300;
  const icon = pass ? "✅" : "❌";
  console.log(`${icon}  [${res.status}] ${label}`);
  if (!pass) {
    console.error("    Response:", JSON.stringify(res.body, null, 2));
    process.exit(1);
  }
  return res.body;
}

async function main() {
  console.log("🚀 Razorpay payment flow test");
  console.log(`   API: ${BASE_URL}\n`);

  // ── Step 1: Login ──────────────────────────────────────────────────────────
  const loginRes = await request("POST", "/customers/login", {
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
  });
  const loginData = ok("Customer login", loginRes);
  const token =
    loginData.token ??
    loginData.access_token ??
    loginData.accessToken ??
    loginData.data?.token ??
    loginData.data?.access_token;
  if (!token) {
    console.error("❌  No token in login response:", loginData);
    process.exit(1);
  }
  console.log(`   Token: ${token.slice(0, 30)}...\n`);

  // ── Step 2: Get variant ID ─────────────────────────────────────────────────
  const varRes = await request("GET", "/products?search=Test+Product+E2E", null, token);
  ok("Fetch test product list", varRes);

  let variantId = null;
  let productId = null;
  const products = varRes.body?.data ?? varRes.body?.products ?? varRes.body;
  if (Array.isArray(products) && products.length > 0) {
    const first = products[0];
    productId = first.id;
    if (first.variants?.length) {
      variantId = first.variants[0].id;
    }
  }

  if (!variantId) {
    // fallback: get variant by SKU from the known test data
    const varSkuRes = await request("GET", "/products", null, token);
    const all = varSkuRes.body?.data ?? varSkuRes.body?.products ?? varSkuRes.body;
    if (Array.isArray(all)) {
      for (const p of all) {
        const v = (p.variants ?? []).find((v) => v.sku === "TEST-VAR-E2E-001");
        if (v) { variantId = v.id; productId = p.id; break; }
      }
    }
  }

  if (!variantId) {
    console.error("❌  Could not find test variant. Run: pnpm run db:seed:test first.");
    process.exit(1);
  }
  console.log(`   Variant ID: ${variantId}, Product ID: ${productId}\n`);

  // ── Step 3: Add to cart ────────────────────────────────────────────────────
  const cartRes = await request("POST", "/cart/add", { productId, variantId, quantity: 1 }, token);
  ok("Add item to cart", cartRes);

  // ── Step 4: Checkout summary ───────────────────────────────────────────────
  const summaryRes = await request("GET", "/checkout/summary", null, token);
  const summary = ok("Checkout summary", summaryRes);
  console.log(`   Total: ₹${summary.total ?? summary.totalAmount ?? "?"}\n`);

  // ── Step 5: Place order ────────────────────────────────────────────────────
  // Get shipping address ID from profile or use null (service falls back to first address)
  const placeRes = await request(
    "POST",
    "/checkout/place-order",
    { paymentMethod: "UPI" },
    token,
  );
  const order = ok("Place order", placeRes);
  const orderId = order.id ?? order.orderId ?? order.data?.id ?? order.data?.orderId;
  const orderNumber = order.orderNumber ?? order.data?.orderNumber;
  const totalAmount = order.totalAmount ?? order.data?.totalAmount;
  console.log(`   Order ID   : ${orderId}`);
  console.log(`   Order No   : ${orderNumber}`);
  console.log(`   Total Amt  : ₹${totalAmount}\n`);

  if (!orderId) {
    console.error("❌  Could not extract orderId from place-order response:", JSON.stringify(order, null, 2));
    process.exit(1);
  }

  // ── Step 6: Create Razorpay order ─────────────────────────────────────────
  const rpRes = await request(
    "POST",
    "/payments/razorpay/create-order",
    { orderId },
    token,
  );
  const rpOrder = ok("Create Razorpay order", rpRes);

  const rpData = rpOrder.data ?? rpOrder;

  console.log("\n🎉  Razorpay order created successfully!\n");
  console.log("   ┌─────────────────────────────────────────────┐");
  console.log(`   │  razorpayOrderId : ${rpData.razorpayOrderId}`);
  console.log(`   │  amount (paise)  : ${rpData.amount}  (₹${(rpData.amount / 100).toFixed(2)})`);
  console.log(`   │  currency        : ${rpData.currency}`);
  console.log(`   │  keyId           : ${rpData.keyId}`);
  console.log(`   │  orderNumber     : ${rpData.orderNumber}`);
  console.log("   └─────────────────────────────────────────────┘\n");

  console.log("👉  Use the above values in Razorpay Checkout JS to simulate a payment.");
  console.log("    After payment, call POST /payments/razorpay/verify with:");
  console.log(`    {
      "orderId": ${orderId},
      "razorpayOrderId": "${rpData.razorpayOrderId}",
      "razorpayPaymentId": "<from razorpay callback>",
      "razorpaySignature": "<from razorpay callback>"
    }`);
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
