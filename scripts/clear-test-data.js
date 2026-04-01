/**
 * Deletes all e-commerce rows (orders, carts, products, customers, coupons, etc.).
 * Keeps `User`, `UserProfile`, `UserAddress`, and `Admin` so auth smoke tests still work.
 *
 * Run after integration tests or when resetting a dev DB. Requires DATABASE_URL.
 */
require("dotenv/config");
const { createPrismaClient } = require("./create-prisma-client");

async function main() {
  const prisma = createPrismaClient();
  console.log("🗑️  Clearing e-commerce data...");

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany();
    await tx.shipment.deleteMany();
    await tx.orderItem.deleteMany();
    await tx.checkoutIdempotency.deleteMany();
    await tx.order.deleteMany();
    await tx.productReview.deleteMany();
    await tx.cartItem.deleteMany();
    await tx.cart.deleteMany();
    await tx.checkoutSession.deleteMany();
    await tx.wishlist.deleteMany();
    await tx.variantImage.deleteMany();
    await tx.productImage.deleteMany();
    await tx.productSpecItem.deleteMany();
    await tx.productSpecification.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.product.deleteMany();
    await tx.category.deleteMany();
    await tx.brand.deleteMany();
    await tx.tax.deleteMany();
    await tx.coupon.deleteMany();
    await tx.customerAddress.deleteMany();
    await tx.customer.deleteMany();
    await tx.uploadedImage.deleteMany();
  });

  await prisma.$disconnect();
  console.log("🗑️  Clear complete (User / Admin tables unchanged).");
}

main().catch((e) => {
  console.error("❌ clear-test-data failed:", e.message);
  process.exit(1);
});
