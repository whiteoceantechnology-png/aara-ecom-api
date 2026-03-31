import "dotenv/config";
import { defineConfig } from "prisma/config";

function normalizeNodeDatabaseUrl(url: string): string {
  if (/^jdbc:mariadb:\/\//i.test(url)) {
    return `mariadb://${url.slice("jdbc:mariadb://".length)}`;
  }
  if (/^jdbc:mysql:\/\//i.test(url)) {
    return `mysql://${url.slice("jdbc:mysql://".length)}`;
  }
  return url;
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizeNodeDatabaseUrl(process.env.DATABASE_URL);
}

function resolveProvider(): "postgres" | "mariadb" {
  const explicit = (process.env.DATABASE_PROVIDER || "").toLowerCase().trim();
  if (explicit === "mariadb" || explicit === "mysql") return "mariadb";
  if (explicit === "postgres" || explicit === "postgresql") return "postgres";
  const url = process.env.DATABASE_URL || "";
  if (/^(mysql|mariadb):\/\//i.test(url)) return "mariadb";
  return "postgres";
}

const provider = resolveProvider();

// Paths are relative to this file's directory (`prisma/`), not the repo root.
export default defineConfig({
  schema: provider === "mariadb" ? "schema.mariadb.prisma" : "schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: provider === "mariadb" ? "migrations_mariadb" : "migrations",
  },
});
