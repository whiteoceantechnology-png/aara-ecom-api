-- Product-pool inventory only: drop variant stock counters.
-- StockMovement becomes product-centric; SaleTransaction records sells.

ALTER TABLE `StockMovement` ADD COLUMN `productId` INTEGER NULL;

UPDATE `StockMovement` sm
INNER JOIN `ProductVariant` pv ON pv.id = sm.variantId
SET sm.productId = pv.productId;

DELETE FROM `StockMovement` WHERE `productId` IS NULL;

ALTER TABLE `StockMovement` MODIFY `productId` INTEGER NOT NULL;

ALTER TABLE `StockMovement` DROP FOREIGN KEY `StockMovement_variantId_fkey`;
ALTER TABLE `StockMovement` MODIFY `variantId` INTEGER NULL;

ALTER TABLE `StockMovement`
  ADD CONSTRAINT `StockMovement_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `StockMovement_variantId_fkey`
    FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `StockMovement_productId_createdAt_idx` ON `StockMovement`(`productId`, `createdAt`);

ALTER TABLE `ProductVariant` DROP COLUMN `stockQuantity`;
ALTER TABLE `ProductVariant` DROP COLUMN `reservedQuantity`;

CREATE TABLE `SaleTransaction` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER NOT NULL,
  `orderItemId` INTEGER NULL,
  `productId` INTEGER NOT NULL,
  `variantId` INTEGER NULL,
  `productName` VARCHAR(191) NOT NULL,
  `sizeLabel` VARCHAR(191) NOT NULL,
  `sku` VARCHAR(191) NULL,
  `quantity` INTEGER NOT NULL,
  `unitsConsumed` INTEGER NOT NULL,
  `unitPrice` DECIMAL(10, 2) NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `paymentMethod` VARCHAR(191) NULL,
  `stockBefore` INTEGER NOT NULL,
  `stockAfter` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SaleTransaction_orderId_idx`(`orderId`),
  INDEX `SaleTransaction_productId_createdAt_idx`(`productId`, `createdAt`),
  INDEX `SaleTransaction_createdAt_idx`(`createdAt`),
  CONSTRAINT `SaleTransaction_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SaleTransaction_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SaleTransaction_variantId_fkey`
    FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
