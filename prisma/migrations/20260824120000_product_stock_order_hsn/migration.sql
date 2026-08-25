-- Product-level stock + OrderItem HSN snapshot for invoices
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stockUnit" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "hsnCode" TEXT;

UPDATE "OrderItem" oi
SET "hsnCode" = p."hsnCode"
FROM "ProductVariant" pv
JOIN "Product" p ON p."id" = pv."productId"
WHERE pv."id" = oi."variantId"
  AND oi."hsnCode" IS NULL
  AND p."hsnCode" IS NOT NULL;

UPDATE "Product" p
SET "stock" = COALESCE(v.total_stock, 0)
FROM (
  SELECT "productId", SUM("stockQuantity")::int AS total_stock
  FROM "ProductVariant"
  GROUP BY "productId"
) v
WHERE v."productId" = p."id";
