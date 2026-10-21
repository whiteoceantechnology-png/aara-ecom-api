import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AppSettingsService } from "./app-settings.service";

function build(
  rows: { key: string; value: string }[],
  env: Record<string, string> = {},
) {
  const prisma = {
    appSetting: {
      findMany: jest.fn().mockResolvedValue(rows),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
  const config = { get: jest.fn((k: string) => env[k]) };
  const service = new AppSettingsService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
  );
  return { service, prisma };
}

describe("AppSettingsService", () => {
  it("prefers database values over env", async () => {
    const { service } = build(
      [{ key: "RAZORPAY_KEY_ID", value: "rzp_live_db" }],
      { RAZORPAY_KEY_ID: "rzp_test_env", DELHIVERY_EMAIL: "env@x.com" },
    );
    await service.onModuleInit();
    expect(service.get("RAZORPAY_KEY_ID")).toBe("rzp_live_db");
    expect(service.source("RAZORPAY_KEY_ID")).toBe("database");
    expect(service.get("DELHIVERY_EMAIL")).toBe("env@x.com");
    expect(service.source("DELHIVERY_EMAIL")).toBe("env");
    expect(service.get("DELHIVERY_PASSWORD")).toBe("");
  });

  it("masks secrets in listMasked", async () => {
    const { service } = build([
      { key: "DELHIVERY_PASSWORD", value: "SuperSecret123" },
      { key: "DELHIVERY_EMAIL", value: "ops@x.com" },
    ]);
    await service.onModuleInit();
    const list = service.listMasked();
    const pwd = list.find((e) => e.key === "DELHIVERY_PASSWORD");
    const email = list.find((e) => e.key === "DELHIVERY_EMAIL");
    expect(pwd?.value).toBe("Su****23");
    expect(JSON.stringify(list)).not.toContain("SuperSecret123");
    expect(email?.value).toBe("ops@x.com");
  });

  it("upserts, deletes on empty, ignores undefined, rejects unknown keys", async () => {
    const { service, prisma } = build([]);
    await service.setMany({
      RAZORPAY_KEY_ID: " rzp_live_new ",
      DELHIVERY_PASSWORD: "",
      DELHIVERY_EMAIL: undefined,
    });
    expect(prisma.appSetting.upsert).toHaveBeenCalledWith({
      where: { key: "RAZORPAY_KEY_ID" },
      create: { key: "RAZORPAY_KEY_ID", value: "rzp_live_new" },
      update: { value: "rzp_live_new" },
    });
    expect(prisma.appSetting.deleteMany).toHaveBeenCalledWith({
      where: { key: "DELHIVERY_PASSWORD" },
    });
    expect(prisma.appSetting.upsert).toHaveBeenCalledTimes(1);

    await expect(service.setMany({ JWT_SECRET: "x" })).rejects.toThrow(
      BadRequestException,
    );
  });
});
