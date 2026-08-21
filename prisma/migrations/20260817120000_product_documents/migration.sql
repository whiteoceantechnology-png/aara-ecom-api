CREATE TABLE IF NOT EXISTS "ProductDocument" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentTitle" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductDocument_productId_documentType_idx" ON "ProductDocument"("productId", "documentType");
