-- Explicit TEXT for product description fields (Postgres String already maps to TEXT)
ALTER TABLE "Product" ALTER COLUMN "description" SET DATA TYPE TEXT;
ALTER TABLE "ProductSpecification" ALTER COLUMN "shortDescription" SET DATA TYPE TEXT;
ALTER TABLE "ProductSpecification" ALTER COLUMN "productDescription" SET DATA TYPE TEXT;
ALTER TABLE "ProductSpecification" ALTER COLUMN "moreInfo" SET DATA TYPE TEXT;
