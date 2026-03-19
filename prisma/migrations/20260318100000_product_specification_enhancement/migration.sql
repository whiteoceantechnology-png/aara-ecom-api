-- Add shortDescription to ProductSpecification
ALTER TABLE "ProductSpecification" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;

-- Remove duplicate ProductSpecification records (keep lowest id per productId)
DELETE FROM "ProductSpecification" a
USING "ProductSpecification" b
WHERE a.id > b.id AND a."productId" = b."productId";

-- Add unique constraint on productId
CREATE UNIQUE INDEX IF NOT EXISTS "ProductSpecification_productId_key" ON "ProductSpecification"("productId");

-- CreateTable ProductSpecItem for filterable/searchable specs
CREATE TABLE "ProductSpecItem" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductSpecItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for filtering
CREATE INDEX "ProductSpecItem_key_value_idx" ON "ProductSpecItem"("key", "value");
CREATE INDEX "ProductSpecItem_productId_idx" ON "ProductSpecItem"("productId");

-- AddForeignKey
ALTER TABLE "ProductSpecItem" ADD CONSTRAINT "ProductSpecItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
