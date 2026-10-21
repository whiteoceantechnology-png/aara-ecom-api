import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

/** Credential keys that may be stored in the `AppSetting` table. */
export const CREDENTIAL_KEYS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "DELHIVERY_EMAIL",
  "DELHIVERY_PASSWORD",
] as const;

export type CredentialKey = (typeof CREDENTIAL_KEYS)[number];

const SECRET_KEYS: ReadonlySet<CredentialKey> = new Set([
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "DELHIVERY_PASSWORD",
]);

export function isCredentialKey(key: string): key is CredentialKey {
  return (CREDENTIAL_KEYS as readonly string[]).includes(key);
}

function mask(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

/**
 * Reads integration credentials from the database (cached in memory).
 * Falls back to environment variables only when a key has no DB row,
 * so local development with `.env` keeps working.
 */
@Injectable()
export class AppSettingsService implements OnModuleInit {
  private readonly logger = new Logger(AppSettingsService.name);
  private cache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.reload();
  }

  async reload(): Promise<void> {
    const rows = await this.prisma.appSetting.findMany();
    this.cache = new Map(rows.map((r) => [r.key, r.value]));
    this.logger.log(`Loaded ${rows.length} setting(s) from database`);
  }

  get(key: CredentialKey): string {
    const fromDb = this.cache.get(key);
    if (fromDb !== undefined) return fromDb.trim();
    return this.config.get<string>(key)?.trim() ?? "";
  }

  source(key: CredentialKey): "database" | "env" | "unset" {
    if (this.cache.has(key)) return "database";
    return this.config.get<string>(key)?.trim() ? "env" : "unset";
  }

  /** Masked view for admin UI — never returns raw secrets. */
  listMasked() {
    return CREDENTIAL_KEYS.map((key) => {
      const value = this.get(key);
      return {
        key,
        secret: SECRET_KEYS.has(key),
        source: this.source(key),
        configured: Boolean(value),
        value: SECRET_KEYS.has(key) ? mask(value) : value,
      };
    });
  }

  /** Upserts given keys; empty string or null deletes the DB row; undefined is ignored. */
  async setMany(entries: Record<string, string | null | undefined>) {
    const keys = Object.keys(entries).filter((k) => entries[k] !== undefined);
    const unknown = keys.filter((k) => !isCredentialKey(k));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown setting key(s): ${unknown.join(", ")}`,
      );
    }

    await this.prisma.$transaction(
      keys.map((key) => {
        const value = entries[key]?.trim() ?? "";
        return value
          ? this.prisma.appSetting.upsert({
              where: { key },
              create: { key, value },
              update: { value },
            })
          : this.prisma.appSetting.deleteMany({ where: { key } });
      }),
    );

    await this.reload();
    return this.listMasked();
  }
}
