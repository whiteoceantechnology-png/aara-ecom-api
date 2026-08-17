ALTER TABLE "CustomerAddress" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Shipment"
  ADD COLUMN IF NOT EXISTS "zone" TEXT,
  ADD COLUMN IF NOT EXISTS "weightKg" DECIMAL(8, 3),
  ADD COLUMN IF NOT EXISTS "codAmount" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "rate" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "ndrReason" TEXT,
  ADD COLUMN IF NOT EXISTS "ndrNote" TEXT,
  ADD COLUMN IF NOT EXISTS "rtoReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lastLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "lastScanAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qcResult" TEXT,
  ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scans" JSONB;

CREATE TABLE IF NOT EXISTS "PaymentLink" (
  "id" SERIAL PRIMARY KEY,
  "linkId" TEXT NOT NULL UNIQUE,
  "orderId" INTEGER,
  "amount" DECIMAL(10, 2) NOT NULL,
  "phone" TEXT,
  "note" TEXT,
  "url" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'created',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PaymentLink_status_createdAt_idx" ON "PaymentLink"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "PaymentSettlement" (
  "id" SERIAL PRIMARY KEY,
  "settlementId" TEXT NOT NULL UNIQUE,
  "expected" DECIMAL(12, 2) NOT NULL,
  "got" DECIMAL(12, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "settledAt" TIMESTAMP(3),
  "note" TEXT,
  "transactions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PaymentSettlement_status_settledAt_idx" ON "PaymentSettlement"("status", "settledAt");

CREATE TABLE IF NOT EXISTS "PaymentWebhookLog" (
  "id" SERIAL PRIMARY KEY,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "received" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PaymentWebhookLog_createdAt_idx" ON "PaymentWebhookLog"("createdAt");

CREATE TABLE IF NOT EXISTS "LogisticsConfig" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "defaultCourier" TEXT NOT NULL DEFAULT 'delhivery',
  "autoNdrReattemptLimit" INTEGER NOT NULL DEFAULT 3,
  "rtoAutoCloseDays" INTEGER NOT NULL DEFAULT 7,
  "walletBalance" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "walletLowBalanceThreshold" DECIMAL(12, 2) NOT NULL DEFAULT 1000,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "LogisticsConfig" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "LogisticsWalletTxn" (
  "id" SERIAL PRIMARY KEY,
  "amount" DECIMAL(12, 2) NOT NULL,
  "paymentReference" TEXT,
  "balanceAfter" DECIMAL(12, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
