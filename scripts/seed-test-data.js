/**
 * Inserts a full e-commerce test dataset (categories, brands, tax, products,
 * variants, customer, coupon, cart, optional review). Safe to run multiple times
 * if you clear first — uses fixed slugs/SKUs and upserts where practical.
 *
 * Requires: DATABASE_URL (+ DATABASE_PROVIDER for MariaDB), same as `npm run db:seed`.
 */
require("dotenv/config");
const bcrypt = require("bcrypt");
const { createPrismaClient } = require("./create-prisma-client");
const { ensurePackSizeId1 } = require("./ensure-pack-size-id1");

const TEST = {
  brandSlug: "test-brand-ecom",
  categoryName: "Test Category E2E",
  productSlug: "test-product-ecom-seed",
  variantSku: "TEST-VAR-E2E-001",
  customerEmail: "test.customer@ecom.local",
  customerPassword: "Test@123456",
  couponCode: "TESTE2E10",
};

function altTagsValue() {
  return [];
}

async function ensurePackSizes(prisma) {
  const packSizes = [
    { size: 25, unit: "g", label: "25 g" },
    { size: 100, unit: "g", label: "100 g" },
    { size: 500, unit: "g", label: "500 g" },
  ];
  const existing = await prisma.packSize.count();
  if (existing === 0) {
    await prisma.packSize.createMany({
      data: packSizes.map((ps) => ({
        size: ps.size,
        unit: ps.unit,
        label: ps.label,
      })),
    });
    console.log(`  ✅ Inserted ${packSizes.length} pack sizes`);
  }
  return prisma.packSize.findFirst({
    where: { label: "100 g" },
  });
}

async function main() {
  const prisma = createPrismaClient();
  console.log("🧪 Seeding test data...");

  await ensurePackSizeId1(prisma);

  const packSize = await ensurePackSizes(prisma);
  if (!packSize) {
    throw new Error("No PackSize row available after ensurePackSizes");
  }

  let tax = await prisma.tax.findFirst({ where: { name: "Test GST 18%" } });
  if (!tax) {
    tax = await prisma.tax.create({
      data: { name: "Test GST 18%", percent: 18 },
    });
    console.log("  ✅ Tax: Test GST 18%");
  } else {
    console.log("  ⏭️  Tax already present");
  }

  let brand = await prisma.brand.findUnique({
    where: { slug: TEST.brandSlug },
  });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name: "Test Brand E2E",
        slug: TEST.brandSlug,
        logoUrl: "https://example.com/logo.png",
        isActive: true,
      },
    });
    console.log("  ✅ Brand: Test Brand E2E");
  } else {
    console.log("  ⏭️  Brand already present");
  }

  let category = await prisma.category.findFirst({
    where: { name: TEST.categoryName },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: TEST.categoryName,
        categoryImage: "https://example.com/cat.jpg",
        isActive: true,
      },
    });
    console.log("  ✅ Category");
  } else {
    console.log("  ⏭️  Category already present");
  }

  let product = await prisma.product.findUnique({
    where: { slug: TEST.productSlug },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        categoryId: category.id,
        brandId: brand.id,
        name: "Test Product E2E",
        slug: TEST.productSlug,
        description: "Synthetic product for frontend / integration checks.",
        hsnCode: "12345678",
        taxId: tax.id,
        taxPercent: 18,
        actualPrice: 199,
        discountPrice: 149,
        productImage: "https://example.com/p.jpg",
        status: true,
      },
    });
    await prisma.productSpecification.create({
      data: {
        productId: product.id,
        productSpecification: [],
        shortDescription: "Short",
        productDescription: "Long description",
      },
    });
    console.log("  ✅ Product + specification");
  } else {
    console.log("  ⏭️  Product already present");
  }

  const existingVar = await prisma.productVariant.findUnique({
    where: { sku: TEST.variantSku },
  });
  if (!existingVar) {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        packSizeId: packSize.id,
        variantName: "100 g pack",
        price: 149,
        actualPrice: 199,
        discountPrice: 149,
        sku: TEST.variantSku,
        stockQuantity: 100,
        reservedQuantity: 0,
        altTags: altTagsValue(),
        status: true,
      },
    });
    console.log("  ✅ Product variant");
  } else {
    console.log("  ⏭️  Variant already present");
  }

  const variant = await prisma.productVariant.findUnique({
    where: { sku: TEST.variantSku },
  });
  if (!variant) throw new Error("variant missing");

  let customer = await prisma.customer.findUnique({
    where: { email: TEST.customerEmail },
  });
  if (!customer) {
    const passwordHash = await bcrypt.hash(TEST.customerPassword, 10);
    customer = await prisma.customer.create({
      data: {
        name: "Test Customer E2E",
        email: TEST.customerEmail,
        phone: "+919999999999",
        passwordHash,
        isBlocked: false,
      },
    });
    console.log("  ✅ Customer");
  } else {
    console.log("  ⏭️  Customer already present");
  }

  const addrCount = await prisma.customerAddress.count({
    where: { customerId: customer.id },
  });
  if (addrCount === 0) {
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        name: "Test Customer E2E",
        phone: "+919999999999",
        addressLine1: "1 Test Street",
        addressLine2: "Suite 2",
        city: "Chennai",
        state: "TN",
        postalCode: "600001",
        country: "IN",
      },
    });
    console.log("  ✅ Customer address");
  } else {
    console.log("  ⏭️  Customer address already present");
  }

  let coupon = await prisma.coupon.findUnique({
    where: { code: TEST.couponCode },
  });
  if (!coupon) {
    coupon = await prisma.coupon.create({
      data: {
        code: TEST.couponCode,
        percentOff: 10,
        minOrderAmount: 100,
        maxDiscountAmount: 50,
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✅ Coupon");
  } else {
    console.log("  ⏭️  Coupon already present");
  }

  let cart = await prisma.cart.findFirst({ where: { customerId: customer.id } });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId: customer.id },
    });
  }
  const cartItemCount = await prisma.cartItem.count({
    where: { cartId: cart.id, variantId: variant.id },
  });
  if (cartItemCount === 0) {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: variant.id,
        productId: product.id,
        quantity: 2,
        price: variant.price,
      },
    });
    console.log("  ✅ Cart item");
  } else {
    console.log("  ⏭️  Cart item already present");
  }

  const reviewExists = await prisma.productReview.findFirst({
    where: { customerId: customer.id, productId: product.id },
  });
  if (!reviewExists) {
    await prisma.productReview.create({
      data: {
        customerId: customer.id,
        productId: product.id,
        orderId: null,
        rating: 5,
        comment: "Test review for seeded data.",
      },
    });
    console.log("  ✅ Product review");
  } else {
    console.log("  ⏭️  Review already present");
  }

  await prisma.$disconnect();
  console.log("🧪 Test data seed complete.");
  console.log("");
  console.log("  Login (customer):", TEST.customerEmail, "/", TEST.customerPassword);
  console.log("  Coupon:", TEST.couponCode);
  console.log("  Product slug:", TEST.productSlug);
  console.log("  Variant SKU:", TEST.variantSku);
}

main().catch((e) => {
  console.error("❌ seed-test-data failed:", e.message);
  process.exit(1);
});
