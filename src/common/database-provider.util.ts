/** Which SQL dialect / Prisma datasource the app is using (from env). */
export type DatabaseProvider = "postgres" | "mariadb";

/**
 * Converts JDBC-style URLs (e.g. from Java tools) to Node/Prisma connection strings.
 * Prisma expects `postgresql://`, `mysql://`, or `mariadb://`, not `jdbc:...`.
 */
export function normalizeNodeDatabaseUrl(url: string): string {
  if (/^jdbc:mariadb:\/\//i.test(url)) {
    return `mariadb://${url.slice("jdbc:mariadb://".length)}`;
  }
  if (/^jdbc:mysql:\/\//i.test(url)) {
    return `mysql://${url.slice("jdbc:mysql://".length)}`;
  }
  return url;
}

/** `@prisma/adapter-mariadb` expects `mariadb://` (not `mysql://`) in some versions. */
export function toMariadbAdapterUrl(url: string): string {
  const n = normalizeNodeDatabaseUrl(url);
  if (/^mysql:\/\//i.test(n)) {
    return `mariadb://${n.slice("mysql://".length)}`;
  }
  return n;
}

/** Fail fast when `DATABASE_PROVIDER` and `DATABASE_URL` disagree. */
export function assertUrlMatchesProvider(
  url: string,
  provider: DatabaseProvider,
): void {
  const isPg = /^postgresql?:\/\//i.test(url);
  const isMy = /^(mysql|mariadb):\/\//i.test(url);
  if (provider === "mariadb" && isPg) {
    throw new Error(
      "DATABASE_PROVIDER is mariadb but DATABASE_URL is PostgreSQL. " +
        "Use mysql:// or mariadb:// (e.g. mariadb://user:pass@localhost:3306/ecomdb). " +
        "Or set DATABASE_PROVIDER=postgres to match a postgresql:// URL.",
    );
  }
  if (provider === "postgres" && isMy) {
    throw new Error(
      "DATABASE_PROVIDER is postgres but DATABASE_URL is MySQL/MariaDB. " +
        "Use postgresql://... or set DATABASE_PROVIDER=mariadb.",
    );
  }
}

export function resolveDatabaseProvider(): DatabaseProvider {
  const explicit = (process.env.DATABASE_PROVIDER || "").toLowerCase().trim();
  if (explicit === "mariadb" || explicit === "mysql") return "mariadb";
  if (explicit === "postgres" || explicit === "postgresql") return "postgres";
  const url = process.env.DATABASE_URL
    ? normalizeNodeDatabaseUrl(process.env.DATABASE_URL)
    : "";
  if (/^(mysql|mariadb):\/\//i.test(url)) return "mariadb";
  return "postgres";
}

export function quoteSqlIdentifier(name: string): string {
  if (resolveDatabaseProvider() === "mariadb") {
    return `\`${name.replace(/`/g, "``")}\``;
  }
  return `"${name.replace(/"/g, '""')}"`;
}

/** Normalize Prisma `$executeRaw` affected row counts (e.g. bigint on some drivers). */
export function affectedRowsCount(rows: unknown): number {
  if (typeof rows === "bigint") return Number(rows);
  if (typeof rows === "number") return rows;
  return Number(rows);
}

/**
 * Case-insensitive search: Postgres supports `mode: insensitive`; MySQL/MariaDB Prisma client does not.
 * On MariaDB, `contains` uses the column collation (often case-insensitive for utf8mb4).
 */
export function stringContainsFilter(search: string) {
  if (resolveDatabaseProvider() === "mariadb") {
    return { contains: search };
  }
  return { contains: search, mode: "insensitive" as const };
}

/** Same as {@link stringContainsFilter} for `equals` (e.g. spec key/value filters). */
export function stringEqualsInsensitiveFilter(value: string) {
  if (resolveDatabaseProvider() === "mariadb") {
    return { equals: value };
  }
  return { equals: value, mode: "insensitive" as const };
}
