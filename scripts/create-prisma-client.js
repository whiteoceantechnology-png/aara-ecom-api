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

module.exports = {
  createPrismaClient,
  normalizeNodeDatabaseUrl,
  resolveProvider,
};
