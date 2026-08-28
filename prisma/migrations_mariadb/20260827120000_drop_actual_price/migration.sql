-- Remove obsolete MRP/actualPrice columns (selling price is ProductVariant.price).
ALTER TABLE `Product` DROP COLUMN `actualPrice`;
ALTER TABLE `ProductVariant` DROP COLUMN `actualPrice`;
