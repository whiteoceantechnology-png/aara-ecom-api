ALTER TABLE "Wishlist" DROP CONSTRAINT IF EXISTS "Wishlist_userId_fkey";
DROP INDEX IF EXISTS "Wishlist_userId_productId_key";
DROP INDEX IF EXISTS "Wishlist_userId_idx";
ALTER TABLE "Wishlist" RENAME COLUMN "userId" TO "customerId";
CREATE UNIQUE INDEX "Wishlist_customerId_productId_key" ON "Wishlist"("customerId", "productId");
CREATE INDEX "Wishlist_customerId_idx" ON "Wishlist"("customerId");
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
