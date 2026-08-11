-- Allow unlimited-length product descriptions (was VARCHAR(191))
ALTER TABLE `Product` MODIFY `description` LONGTEXT NULL;
ALTER TABLE `ProductSpecification` MODIFY `shortDescription` LONGTEXT NULL;
ALTER TABLE `ProductSpecification` MODIFY `productDescription` LONGTEXT NULL;
ALTER TABLE `ProductSpecification` MODIFY `moreInfo` LONGTEXT NULL;
