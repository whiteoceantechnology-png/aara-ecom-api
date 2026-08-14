-- Order ops lifecycle: events, refunds, richer payment rows

ALTER TABLE `Payment`
  ADD COLUMN `amount` DECIMAL(10, 2) NULL,
  ADD COLUMN `reference` VARCHAR(191) NULL,
  ADD COLUMN `notes` TEXT NULL;

CREATE TABLE `OrderEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `detail` TEXT NULL,
  `actorType` VARCHAR(191) NOT NULL DEFAULT 'admin',
  `actorName` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OrderEvent_orderId_createdAt_idx`(`orderId`, `createdAt`),
  CONSTRAINT `OrderEvent_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderRefund` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'requested',
  `items` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OrderRefund_orderId_idx`(`orderId`),
  CONSTRAINT `OrderRefund_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
