-- Move Wishlist ownership from User to Customer
ALTER TABLE `Wishlist` DROP FOREIGN KEY `Wishlist_userId_fkey`;
DROP INDEX `Wishlist_userId_productId_key` ON `Wishlist`;
DROP INDEX `Wishlist_userId_idx` ON `Wishlist`;
ALTER TABLE `Wishlist` CHANGE `userId` `customerId` INTEGER NOT NULL;
CREATE UNIQUE INDEX `Wishlist_customerId_productId_key` ON `Wishlist`(`customerId`, `productId`);
CREATE INDEX `Wishlist_customerId_idx` ON `Wishlist`(`customerId`);
ALTER TABLE `Wishlist` ADD CONSTRAINT `Wishlist_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
