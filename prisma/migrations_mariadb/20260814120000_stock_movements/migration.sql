-- Stock movement audit trail for admin inventory APIs

CREATE TABLE `StockMovement` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `variantId` INTEGER NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `quantityChange` INTEGER NOT NULL,
  `stockBefore` INTEGER NOT NULL,
  `stockAfter` INTEGER NOT NULL,
  `reservedBefore` INTEGER NOT NULL,
  `reservedAfter` INTEGER NOT NULL,
  `reason` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `referenceType` VARCHAR(191) NULL,
  `referenceId` INTEGER NULL,
  `actorType` VARCHAR(191) NOT NULL DEFAULT 'admin',
  `actorName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `StockMovement_variantId_createdAt_idx`(`variantId`, `createdAt`),
  CONSTRAINT `StockMovement_variantId_fkey`
    FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
