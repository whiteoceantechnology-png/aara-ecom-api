-- Customer address website fields + payments/logistics ops tables

ALTER TABLE `CustomerAddress`
  ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `Shipment`
  ADD COLUMN `zone` VARCHAR(191) NULL,
  ADD COLUMN `weightKg` DECIMAL(8, 3) NULL,
  ADD COLUMN `codAmount` DECIMAL(10, 2) NULL,
  ADD COLUMN `rate` DECIMAL(10, 2) NULL,
  ADD COLUMN `ndrReason` VARCHAR(191) NULL,
  ADD COLUMN `ndrNote` TEXT NULL,
  ADD COLUMN `rtoReason` VARCHAR(191) NULL,
  ADD COLUMN `lastLocation` VARCHAR(191) NULL,
  ADD COLUMN `lastScanAt` DATETIME(3) NULL,
  ADD COLUMN `qcResult` VARCHAR(191) NULL,
  ADD COLUMN `receivedAt` DATETIME(3) NULL,
  ADD COLUMN `scans` JSON NULL;

CREATE TABLE `PaymentLink` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `linkId` VARCHAR(191) NOT NULL,
  `orderId` INTEGER NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `note` VARCHAR(191) NULL,
  `url` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'created',
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PaymentLink_linkId_key`(`linkId`),
  INDEX `PaymentLink_status_createdAt_idx`(`status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentSettlement` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `settlementId` VARCHAR(191) NOT NULL,
  `expected` DECIMAL(12, 2) NOT NULL,
  `got` DECIMAL(12, 2) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `settledAt` DATETIME(3) NULL,
  `note` TEXT NULL,
  `transactions` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PaymentSettlement_settlementId_key`(`settlementId`),
  INDEX `PaymentSettlement_status_settledAt_idx`(`status`, `settledAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentWebhookLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `event` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `received` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PaymentWebhookLog_createdAt_idx`(`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LogisticsConfig` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `defaultCourier` VARCHAR(191) NOT NULL DEFAULT 'delhivery',
  `autoNdrReattemptLimit` INTEGER NOT NULL DEFAULT 3,
  `rtoAutoCloseDays` INTEGER NOT NULL DEFAULT 7,
  `walletBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `walletLowBalanceThreshold` DECIMAL(12, 2) NOT NULL DEFAULT 1000,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `LogisticsConfig` (`id`, `defaultCourier`, `autoNdrReattemptLimit`, `rtoAutoCloseDays`, `walletBalance`, `walletLowBalanceThreshold`, `updatedAt`)
VALUES (1, 'delhivery', 3, 7, 0, 1000, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

CREATE TABLE `LogisticsWalletTxn` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `amount` DECIMAL(12, 2) NOT NULL,
  `paymentReference` VARCHAR(191) NULL,
  `balanceAfter` DECIMAL(12, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
