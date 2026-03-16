const { Pool } = require("pg");
require("dotenv/config");

/**
 * Prisma seed script — runs automatically after `prisma migrate reset`.
 * Seeds essential lookup data that the application needs to function.
 */
async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://admin:admin@localhost:5432/ecomdb",
  });

  console.log("🌱 Seeding database...");

  // ─── Pack Sizes ────────────────────────────────────────────────────────────
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

  const existingCount = await pool.query('SELECT count(*)::int AS cnt FROM "PackSize"');
  if (existingCount.rows[0].cnt === 0) {
    for (const ps of packSizes) {
      await pool.query(
        'INSERT INTO "PackSize" (size, unit, label) VALUES ($1, $2, $3)',
        [ps.size, ps.unit, ps.label],
      );
    }
    console.log(`  ✅ Inserted ${packSizes.length} pack sizes`);
  } else {
    console.log(
      `  ⏭️  PackSize table already has ${existingCount.rows[0].cnt} rows — skipped`,
    );
  }

  // ─── Admin User ────────────────────────────────────────────────────────────
  const bcrypt = require("bcrypt");
  const adminExists = await pool.query(
    'SELECT count(*)::int AS cnt FROM "Admin" WHERE username = $1',
    ["admin"],
  );
  if (adminExists.rows[0].cnt === 0) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    await pool.query(
      'INSERT INTO "Admin" (username, password, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
      ["admin", passwordHash, "superadmin"],
    );
    console.log("  ✅ Created default admin (admin / Admin@123)");
  } else {
    console.log("  ⏭️  Admin user already exists — skipped");
  }

  await pool.end();
  console.log("🌱 Seeding complete!");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
