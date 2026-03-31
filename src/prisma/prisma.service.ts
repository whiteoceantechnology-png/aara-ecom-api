import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  assertUrlMatchesProvider,
  normalizeNodeDatabaseUrl,
  resolveDatabaseProvider,
  toMariadbAdapterUrl,
} from "../common/database-provider.util";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  static create(): PrismaService {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error("DATABASE_URL is not set");
    }
    const url = normalizeNodeDatabaseUrl(raw);
    const provider = resolveDatabaseProvider();
    assertUrlMatchesProvider(url, provider);
    process.env.DATABASE_URL = url;

    if (provider === "mariadb") {
      const mariadbUrl = toMariadbAdapterUrl(url);
      // Prisma 7 expects the adapter *factory* (has connect()), not connect()'s result.
      return new PrismaService({ adapter: new PrismaMariaDb(mariadbUrl) });
    }

    // `pg` Pool + PrismaPg resolve to `any`-like types under strict ESLint.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- pg Pool for PrismaPg adapter
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaService({ adapter });
  }

  private constructor(options: ConstructorParameters<typeof PrismaClient>[0]) {
    super(options);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
