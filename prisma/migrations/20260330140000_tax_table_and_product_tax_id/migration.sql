-- CreateTable
CREATE TABLE "Tax" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "taxId" INTEGER;

-- CreateIndex
CREATE INDEX "Product_taxId_idx" ON "Product"("taxId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE SET NULL ON UPDATE CASCADE;
