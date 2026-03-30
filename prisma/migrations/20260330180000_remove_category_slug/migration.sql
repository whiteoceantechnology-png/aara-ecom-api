-- Category no longer stores a URL slug (identify by id / name only).
ALTER TABLE "Category" DROP COLUMN IF EXISTS "slug";
