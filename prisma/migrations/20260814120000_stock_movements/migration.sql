-- Stock movement audit trail for admin inventory APIs

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" SERIAL PRIMARY KEY,
  "variantId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "quantityChange" INTEGER NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reservedBefore" INTEGER NOT NULL,
  "reservedAfter" INTEGER NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "referenceType" TEXT,
  "referenceId" INTEGER,
  "actorType" TEXT NOT NULL DEFAULT 'admin',
  "actorName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StockMovement_variantId_createdAt_idx"
  ON "StockMovement"("variantId", "createdAt");
