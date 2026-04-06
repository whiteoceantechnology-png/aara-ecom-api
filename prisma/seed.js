require("dotenv/config");
const { createPrismaClient } = require("../scripts/create-prisma-client");
const { ensurePackSizeId1 } = require("../scripts/ensure-pack-size-id1");

/**
 * Prisma seed script — runs automatically after `prisma migrate reset`.
 * Seeds essential lookup data that the application needs to function.
 */
async function main() {
  const prisma = createPrismaClient();

  console.log("🌱 Seeding database...");

  const packSizes = [
    { size: 25, unit: "g", label: "25 g" },
    { size: 50, unit: "g", label: "50 g" },
    { size: 100, unit: "g", label: "100 g" },
    { size: 250, unit: "g", label: "250 g" },
    { size: 500, unit: "g", label: "500 g" },
    { size: 1000, unit: "g", label: "1 kg" },
    { size: 50, unit: "ml", label: "50 ml" },
    { size: 100, unit: "ml", label: "100 ml" },
    { size: 250, unit: "ml", label: "250 ml" },
    { size: 500, unit: "ml", label: "500 ml" },
    { size: 1000, unit: "ml", label: "1 L" },
  ];

  const existingPackSizes = await prisma.packSize.count();
  if (existingPackSizes === 0) {
    await prisma.packSize.createMany({
      data: packSizes.map((ps) => ({
        size: ps.size,
        unit: ps.unit,
        label: ps.label,
      })),
    });
    console.log(`  ✅ Inserted ${packSizes.length} pack sizes`);
  } else {
    console.log(
      `  ⏭️  PackSize table already has ${existingPackSizes} rows — skipped`,
    );
  }

  await ensurePackSizeId1(prisma);

  const bcrypt = require("bcrypt");
  const adminCount = await prisma.admin.count({
    where: { username: "admin" },
  });
  if (adminCount === 0) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    await prisma.admin.create({
      data: {
        username: "admin",
        password: passwordHash,
        role: "superadmin",
      },
    });
    console.log("  ✅ Created default admin (admin / Admin@123)");
  } else {
    console.log("  ⏭️  Admin user already exists — skipped");
  }

  // ─── Taxes (IDs 1-10) ──────────────────────────────────────────────────────
  const existingTaxes = await prisma.tax.count();
  if (existingTaxes === 0) {
    const taxes = [
      { id: 1,  name: "GST 0%",    percent: 0   },
      { id: 2,  name: "GST 5%",    percent: 5   },
      { id: 3,  name: "GST 12%",   percent: 12  },
      { id: 4,  name: "GST 18%",   percent: 18  },
      { id: 5,  name: "GST 28%",   percent: 28  },
      { id: 6,  name: "IGST 5%",   percent: 5   },
      { id: 7,  name: "IGST 12%",  percent: 12  },
      { id: 8,  name: "IGST 18%",  percent: 18  },
      { id: 9,  name: "IGST 28%",  percent: 28  },
      { id: 10, name: "Exempt",    percent: 0   },
    ];

    for (const t of taxes) {
      await prisma.$executeRaw`
        INSERT INTO Tax (id, name, percent, createdAt, updatedAt)
        VALUES (${t.id}, ${t.name}, ${t.percent}, NOW(), NOW())
      `;
    }
    await prisma.$executeRaw`ALTER TABLE Tax AUTO_INCREMENT = 11`;
    console.log(`  ✅ Inserted ${taxes.length} taxes (IDs 1-10)`);
  } else {
    console.log(`  ⏭️  Tax table already has ${existingTaxes} rows — skipped`);
  }

  // ─── Brands (IDs 1-15) ─────────────────────────────────────────────────────
  const existingBrands = await prisma.brand.count();
  if (existingBrands === 0) {
    const brands = [
      { id: 1,  name: "Aaraa Naturals",      slug: "aaraa-naturals" },
      { id: 2,  name: "Himalaya Wellness",   slug: "himalaya-wellness" },
      { id: 3,  name: "Organic India",       slug: "organic-india" },
      { id: 4,  name: "Patanjali",           slug: "patanjali" },
      { id: 5,  name: "Dabur",               slug: "dabur" },
      { id: 6,  name: "Baidyanath",          slug: "baidyanath" },
      { id: 7,  name: "Zandu",               slug: "zandu" },
      { id: 8,  name: "Kapiva",              slug: "kapiva" },
      { id: 9,  name: "Sri Sri Tattva",      slug: "sri-sri-tattva" },
      { id: 10, name: "Isha Life",           slug: "isha-life" },
      { id: 11, name: "Forest Essentials",   slug: "forest-essentials" },
      { id: 12, name: "Kama Ayurveda",       slug: "kama-ayurveda" },
      { id: 13, name: "Biotique",            slug: "biotique" },
      { id: 14, name: "Shahnaz Husain",      slug: "shahnaz-husain" },
      { id: 15, name: "Generic",             slug: "generic" },
    ];

    for (const b of brands) {
      await prisma.$executeRaw`
        INSERT INTO Brand (id, name, slug, isActive, createdAt, updatedAt)
        VALUES (${b.id}, ${b.name}, ${b.slug}, true, NOW(), NOW())
      `;
    }
    await prisma.$executeRaw`ALTER TABLE Brand AUTO_INCREMENT = 16`;
    console.log(`  ✅ Inserted ${brands.length} brands (IDs 1-15)`);
  } else {
    console.log(`  ⏭️  Brand table already has ${existingBrands} rows — skipped`);
  }

  // ─── Categories (IDs 1-25) ─────────────────────────────────────────────────
  const existingCats = await prisma.category.count();
  if (existingCats === 0) {
    const categories = [
      { id: 1,  name: "Herbs & Botanicals" },
      { id: 2,  name: "Roots & Rhizomes" },
      { id: 3,  name: "Seeds & Nuts" },
      { id: 4,  name: "Flowers & Petals" },
      { id: 5,  name: "Leaves & Greens" },
      { id: 6,  name: "Bark & Wood" },
      { id: 7,  name: "Resins & Gums" },
      { id: 8,  name: "Powders & Extracts" },
      { id: 9,  name: "Oils & Ghee" },
      { id: 10, name: "Spices & Condiments" },
      { id: 11, name: "Dried Fruits" },
      { id: 12, name: "Ayurvedic Formulations" },
      { id: 13, name: "Teas & Infusions" },
      { id: 14, name: "Superfoods" },
      { id: 15, name: "Mushrooms & Fungi" },
      { id: 16, name: "Seaweeds & Algae" },
      { id: 17, name: "Fermented Products" },
      { id: 18, name: "Honey & Bee Products" },
      { id: 19, name: "Clays & Minerals" },
      { id: 20, name: "Essential Oils" },
      { id: 21, name: "Carrier Oils" },
      { id: 22, name: "Hydrosols & Waters" },
      { id: 23, name: "Waxes & Butters" },
      { id: 24, name: "Incense & Aromatics" },
      { id: 25, name: "Miscellaneous" },
      { id: 26, name: "Candles & Wicks" },
      { id: 27, name: "Molds & Tools" },
      { id: 28, name: "Packaging & Labels" },
      { id: 29, name: "DIY Kits & Combos" },
    ];

    for (const cat of categories) {
      await prisma.$executeRaw`
        INSERT INTO Category (id, name, isActive, createdAt, updatedAt)
        VALUES (${cat.id}, ${cat.name}, true, NOW(), NOW())
      `;
    }
    // Reset auto-increment so next insert goes after 25
    await prisma.$executeRaw`ALTER TABLE Category AUTO_INCREMENT = 26`;
    console.log(`  ✅ Inserted ${categories.length} categories (IDs 1-25)`);
  } else {
    console.log(`  ⏭️  Category table already has ${existingCats} rows — skipped`);
  }

  await prisma.$disconnect();
  console.log("🌱 Seeding complete!");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
