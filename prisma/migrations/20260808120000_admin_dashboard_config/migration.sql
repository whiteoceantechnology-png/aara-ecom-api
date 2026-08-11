CREATE TABLE "ShippingRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "maxOrderAmount" DECIMAL(10,2),
    "shippingAmount" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "orderPlacedEmail" BOOLEAN NOT NULL DEFAULT true,
    "orderShippedEmail" BOOLEAN NOT NULL DEFAULT true,
    "orderDeliveredEmail" BOOLEAN NOT NULL DEFAULT true,
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "adminEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "storeName" TEXT NOT NULL DEFAULT 'Aaraa Homecare',
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'IN',
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);

INSERT INTO "NotificationSettings" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);
INSERT INTO "StoreProfile" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);
