/**
 * Ensures a PackSize row with id=1 exists (Swagger/examples use packSizeId: 1).
 * Safe when id=1 was deleted but other pack sizes remain.
 */
const { createPrismaClient } = require("./create-prisma-client");

async function ensurePackSizeId1(prisma) {
  const row = await prisma.packSize.findUnique({ where: { id: 1 } });
  if (row) return;

  await prisma.packSize.create({
    data: {
      id: 1,
      size: 25,
      unit: "g",
      label: "25 g",
    },
  });
  console.log("  ✅ Ensured PackSize id=1 exists (was missing)");
}

async function main() {
  const prisma = createPrismaClient();
  console.log("🔧 Ensuring PackSize id=1...");
  await ensurePackSizeId1(prisma);
  await prisma.$disconnect();
  console.log("🔧 Done.");
}

module.exports = { ensurePackSizeId1 };

if (require.main === module) {
  main().catch((e) => {
    console.error("❌ Failed:", e.message);
    process.exit(1);
  });
}
