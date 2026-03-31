require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

function normalizeNodeDatabaseUrl(url) {
  if (/^jdbc:mariadb:\/\//i.test(url)) {
    return `mariadb://${url.slice("jdbc:mariadb://".length)}`;
  }
  if (/^jdbc:mysql:\/\//i.test(url)) {
    return `mysql://${url.slice("jdbc:mysql://".length)}`;
  }
  return url;
}

function toMariadbAdapterUrl(url) {
  const n = normalizeNodeDatabaseUrl(url);
  if (/^mysql:\/\//i.test(n)) {
    return `mariadb://${n.slice("mysql://".length)}`;
  }
  return n;
}

function assertUrlMatchesProvider(url, provider) {
  const isPg = /^postgresql?:\/\//i.test(url);
  const isMy = /^(mysql|mariadb):\/\//i.test(url);
  if (provider === "mariadb" && isPg) {
    throw new Error(
      "DATABASE_PROVIDER is mariadb but DATABASE_URL is PostgreSQL. Use mysql:// or mariadb:// for MariaDB.",
    );
  }
  if (provider === "postgres" && isMy) {
    throw new Error(
      "DATABASE_PROVIDER is postgres but DATABASE_URL is MySQL/MariaDB. Use postgresql:// or DATABASE_PROVIDER=mariadb.",
    );
  }
}

function resolveProvider() {
  const explicit = (process.env.DATABASE_PROVIDER || "").toLowerCase().trim();
  if (explicit === "mariadb" || explicit === "mysql") return "mariadb";
  if (explicit === "postgres" || explicit === "postgresql") return "postgres";
  const url = process.env.DATABASE_URL
    ? normalizeNodeDatabaseUrl(process.env.DATABASE_URL)
    : "";
  if (/^(mysql|mariadb):\/\//i.test(url)) return "mariadb";
  return "postgres";
}

function createPrismaClient() {
  const raw =
    process.env.DATABASE_URL ||
    "postgresql://admin:admin@localhost:5432/ecomdb";
  const url = normalizeNodeDatabaseUrl(raw);
  const provider = resolveProvider();
  assertUrlMatchesProvider(url, provider);
  process.env.DATABASE_URL = url;

  if (provider === "mariadb") {
    return new PrismaClient({
      adapter: new PrismaMariaDb(toMariadbAdapterUrl(url)),
    });
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

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
