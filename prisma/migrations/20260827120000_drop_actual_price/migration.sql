-- Remove obsolete MRP/actualPrice columns (selling price is ProductVariant.price).
ALTER TABLE "Product" DROP COLUMN IF EXISTS "actualPrice";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "actualPrice";
