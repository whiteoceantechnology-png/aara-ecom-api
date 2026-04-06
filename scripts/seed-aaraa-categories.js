/**
 * Seed script — creates:
 *   1. Brand: AARAA HOMECARE
 *   2. Categories for every product group
 *   3. GST 5% and GST 18% Tax records
 *
 * Run ONCE before importing the Excel file:
 *   node scripts/seed-aaraa-categories.js
 *
 * Prints a summary table of IDs at the end so you can verify the
 * Excel rows reference the correct categoryId / brandId / taxId.
 */
require("dotenv/config");
const { createPrismaClient } = require("./create-prisma-client");

const BRAND = { name: "AARAA HOMECARE", slug: "aaraa-homecare" };

const CATEGORIES = [
  { name: "Raw Dried Herbs / Flowers / Seeds", slug: "raw-dried-herbs-flowers-seeds" },
  { name: "Herbal Powders",                    slug: "herbal-powders" },
  { name: "Herbal Extracts - Water Soluble",   slug: "herbal-extracts-water-soluble" },
  { name: "Herbal Extracts - Oil Soluble",     slug: "herbal-extracts-oil-soluble" },
  { name: "Chemical Raw Materials",            slug: "chemical-raw-materials" },
  { name: "Actives",                           slug: "actives" },
  { name: "Hydrosols",                         slug: "hydrosols" },
  { name: "Gels",                              slug: "gels" },
  { name: "Clays",                             slug: "clays" },
  { name: "Waxes",                             slug: "waxes" },
  { name: "Butters",                           slug: "butters" },
  { name: "SLS, SLES / Paraben Free Bases",    slug: "sls-sles-paraben-free-bases" },
  { name: "Fruits & Veggie Powders",           slug: "fruits-veggie-powders" },
  { name: "Melt and Pour Soap Bases",          slug: "melt-and-pour-soap-bases" },
  { name: "Cosmetic Bases",                    slug: "cosmetic-bases" },
  { name: "Carrier Oils - Cold Pressed",       slug: "carrier-oils-cold-pressed" },
  { name: "Essential Oils - Cosmetic Grade",   slug: "essential-oils-cosmetic-grade" },
  { name: "Natural Extracts Blends - Water Soluble", slug: "natural-extracts-blends-water-soluble" },
  { name: "Natural Extracts Blends - Oil Soluble",   slug: "natural-extracts-blends-oil-soluble" },
  { name: "Fragrance - Oil Soluble",           slug: "fragrance-oil-soluble" },
  { name: "Fragrance - Water Soluble",         slug: "fragrance-water-soluble" },
  { name: "Premium Fragrance - Oil Soluble",   slug: "premium-fragrance-oil-soluble" },
  { name: "Premium Fragrance - Water Soluble", slug: "premium-fragrance-water-soluble" },
  { name: "Flavour Oils (Grade A)",            slug: "flavour-oils-grade-a" },
  { name: "Colouring Agents",                  slug: "colouring-agents" },
];

const TAXES = [
  { name: "GST 5%",  percent: 5  },
  { name: "GST 18%", percent: 18 },
];

async function main() {
  const prisma = createPrismaClient();
  console.log("🌱  Seeding AARAA HOMECARE master data...\n");

  // ── Brand ──────────────────────────────────────────────────────────────────
  const brand = await prisma.brand.upsert({
    where:  { slug: BRAND.slug },
    update: {},
    create: { name: BRAND.name, slug: BRAND.slug },
  });
  console.log(`✅  Brand   id=${brand.id}  "${brand.name}"`);

  // ── Taxes ──────────────────────────────────────────────────────────────────
  const taxMap = {};
  for (const t of TAXES) {
    const existing = await prisma.tax.findFirst({ where: { name: t.name } });
    const tax = existing
      ? existing
      : await prisma.tax.create({ data: { name: t.name, percent: t.percent } });
    taxMap[t.percent] = tax.id;
    console.log(`✅  Tax     id=${tax.id}  "${tax.name}" (${t.percent}%)`);
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  console.log("\n--- Categories ---");
  const catMap = {};
  for (const c of CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { name: c.name } });
    let cat;
    if (existing) {
      cat = existing;
      console.log(`⏭️   Category id=${cat.id}  already exists  "${cat.name}"`);
    } else {
      cat = await prisma.category.create({ data: { name: c.name } });
      console.log(`✅  Category id=${cat.id}  created          "${cat.name}"`);
    }
    catMap[c.slug] = cat.id;
  }

  // ── Summary table ──────────────────────────────────────────────────────────
  console.log("\n\n════════════════════════════════════════════════════════");
  console.log("  USE THESE IDs WHEN FILLING / VERIFYING THE EXCEL FILE");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  brandId for all products : ${brand.id}`);
  console.log(`  taxId  for GST  5%       : ${taxMap[5]}`);
  console.log(`  taxId  for GST 18%       : ${taxMap[18]}`);
  console.log("\n  Category IDs:");
  for (const c of CATEGORIES) {
    console.log(`    ${String(catMap[c.slug]).padStart(3)}  ${c.name}`);
  }
  console.log("════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌  Seed failed:", e.message);
  process.exit(1);
});
