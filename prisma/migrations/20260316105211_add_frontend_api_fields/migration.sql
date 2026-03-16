-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "categoryImage" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "actualPrice" DECIMAL(10,2),
ADD COLUMN     "discountPrice" DECIMAL(10,2),
ADD COLUMN     "productImage" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "actualPrice" DECIMAL(10,2),
ADD COLUMN     "altTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "discountPrice" DECIMAL(10,2),
ADD COLUMN     "favourites" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isColor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "variantColor" TEXT,
ADD COLUMN     "variantName" TEXT;

-- CreateTable
CREATE TABLE "VariantImage" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VariantImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecification" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "productSpecification" JSONB NOT NULL DEFAULT '[]',
    "moreInfo" TEXT,
    "productDescription" TEXT,

    CONSTRAINT "ProductSpecification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VariantImage" ADD CONSTRAINT "VariantImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecification" ADD CONSTRAINT "ProductSpecification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
