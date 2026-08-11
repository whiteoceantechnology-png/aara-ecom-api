-- Admin config tables for shipping rules, notifications, store profile
CREATE TABLE `ShippingRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `minOrderAmount` DECIMAL(10, 2) NULL,
    `maxOrderAmount` DECIMAL(10, 2) NULL,
    `shippingAmount` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `orderPlacedEmail` BOOLEAN NOT NULL DEFAULT true,
    `orderShippedEmail` BOOLEAN NOT NULL DEFAULT true,
    `orderDeliveredEmail` BOOLEAN NOT NULL DEFAULT true,
    `lowStockAlert` BOOLEAN NOT NULL DEFAULT true,
    `lowStockThreshold` INTEGER NOT NULL DEFAULT 10,
    `adminEmail` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StoreProfile` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `storeName` VARCHAR(191) NOT NULL DEFAULT 'Aaraa Homecare',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL DEFAULT 'IN',
    `logoUrl` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kolkata',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `NotificationSettings` (`id`, `updatedAt`) VALUES (1, CURRENT_TIMESTAMP(3));
INSERT INTO `StoreProfile` (`id`, `updatedAt`) VALUES (1, CURRENT_TIMESTAMP(3));
