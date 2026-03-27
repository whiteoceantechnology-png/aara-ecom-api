-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "avgRating" DECIMAL(3,2),
ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "reservedQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "couponCode" TEXT,
ADD COLUMN "shippingAddressId" INTEGER,
ADD COLUMN "addressSnapshot" JSONB;

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- CreateTable Coupon
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" DECIMAL(5,2),
    "maxDiscountAmount" DECIMAL(10,2),
    "minOrderAmount" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateTable CheckoutSession
CREATE TABLE "CheckoutSession" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "couponCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutSession_customerId_key" ON "CheckoutSession"("customerId");

-- CreateTable CheckoutIdempotency
CREATE TABLE "CheckoutIdempotency" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutIdempotency_orderId_key" ON "CheckoutIdempotency"("orderId");
CREATE UNIQUE INDEX "CheckoutIdempotency_customerId_key_key" ON "CheckoutIdempotency"("customerId", "key");

-- CreateTable ProductReview
CREATE TABLE "ProductReview" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductReview_customerId_productId_key" ON "ProductReview"("customerId", "productId");
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- ForeignKeys
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutIdempotency" ADD CONSTRAINT "CheckoutIdempotency_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckoutIdempotency" ADD CONSTRAINT "CheckoutIdempotency_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
