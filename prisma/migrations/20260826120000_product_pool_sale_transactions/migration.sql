-- Product-pool inventory only: drop variant stock counters.
-- StockMovement becomes product-centric; SaleTransaction records sells.

ALTER TABLE "StockMovement" ADD COLUMN "productId" INTEGER;

UPDATE "StockMovement" sm
SET "productId" = pv."productId"
FROM "ProductVariant" pv
WHERE pv."id" = sm."variantId";

DELETE FROM "StockMovement" WHERE "productId" IS NULL;

ALTER TABLE "StockMovement" ALTER COLUMN "productId" SET NOT NULL;

ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_variantId_fkey";
ALTER TABLE "StockMovement" ALTER COLUMN "variantId" DROP NOT NULL;

ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StockMovement_productId_createdAt_idx"
  ON "StockMovement"("productId", "createdAt");

ALTER TABLE "ProductVariant" DROP COLUMN "stockQuantity";
ALTER TABLE "ProductVariant" DROP COLUMN "reservedQuantity";

CREATE TABLE "SaleTransaction" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "orderItemId" INTEGER,
  "productId" INTEGER NOT NULL,
  "variantId" INTEGER,
  "productName" TEXT NOT NULL,
  "sizeLabel" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitsConsumed" INTEGER NOT NULL,
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "paymentMethod" TEXT,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleTransaction_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SaleTransaction_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SaleTransaction_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SaleTransaction_orderId_idx" ON "SaleTransaction"("orderId");
CREATE INDEX "SaleTransaction_productId_createdAt_idx"
  ON "SaleTransaction"("productId", "createdAt");
CREATE INDEX "SaleTransaction_createdAt_idx" ON "SaleTransaction"("createdAt");
