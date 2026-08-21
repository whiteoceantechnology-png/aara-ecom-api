-- Singleton product policies JSON (id = 1)
CREATE TABLE "ProductPolicies" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "policies" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPolicies_pkey" PRIMARY KEY ("id")
);
