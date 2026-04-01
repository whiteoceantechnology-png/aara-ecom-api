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

  await prisma.$disconnect();
  console.log("🌱 Seeding complete!");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
