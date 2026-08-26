-- Product-level shared inventory pool (variants are pack SKUs only).
ALTER TABLE `Product` ADD COLUMN `reservedStock` INTEGER NOT NULL DEFAULT 0;
