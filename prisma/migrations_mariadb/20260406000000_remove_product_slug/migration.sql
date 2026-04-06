-- Drop unique index and slug column from Product table
ALTER TABLE `Product` DROP INDEX `Product_slug_key`;
ALTER TABLE `Product` DROP COLUMN `slug`;
