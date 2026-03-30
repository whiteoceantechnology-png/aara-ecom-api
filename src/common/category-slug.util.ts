import type { PrismaClient } from "@prisma/client";

/** URL-safe slug from a display name (ASCII). */
export function slugifyCategoryName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "category";
}

/**
 * Resolves a unique `Category.slug` for the given name (appends `-1`, `-2`, … on collision).
 */
export async function uniqueCategorySlug(
  prisma: Pick<PrismaClient, "category">,
  name: string,
): Promise<string> {
  const base = slugifyCategoryName(name);
  let slug = base;
  let n = 0;
  for (;;) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}
