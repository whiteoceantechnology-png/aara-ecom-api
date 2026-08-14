-- Order ops lifecycle: events, refunds, richer payment rows

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "OrderEvent" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "detail" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'admin',
  "actorName" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderEvent_orderId_createdAt_idx"
  ON "OrderEvent"("orderId", "createdAt");

CREATE TABLE IF NOT EXISTS "OrderRefund" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "items" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderRefund_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderRefund_orderId_idx" ON "OrderRefund"("orderId");
