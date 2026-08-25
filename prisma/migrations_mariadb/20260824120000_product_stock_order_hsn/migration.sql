-- Product-level stock + OrderItem HSN snapshot for invoices
ALTER TABLE `Product`
  ADD COLUMN `stock` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `stockUnit` VARCHAR(191) NULL;

ALTER TABLE `OrderItem`
  ADD COLUMN `hsnCode` VARCHAR(191) NULL;

-- Backfill HSN on existing order lines from current product master
UPDATE `OrderItem` oi
INNER JOIN `ProductVariant` pv ON pv.`id` = oi.`variantId`
INNER JOIN `Product` p ON p.`id` = pv.`productId`
SET oi.`hsnCode` = p.`hsnCode`
WHERE oi.`hsnCode` IS NULL AND p.`hsnCode` IS NOT NULL;

-- Backfill product stock from sum of variant on-hand (best-effort)
UPDATE `Product` p
LEFT JOIN (
  SELECT `productId`, SUM(`stockQuantity`) AS totalStock
  FROM `ProductVariant`
  GROUP BY `productId`
) v ON v.`productId` = p.`id`
SET p.`stock` = COALESCE(v.totalStock, 0);
