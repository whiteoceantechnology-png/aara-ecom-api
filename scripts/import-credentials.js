/**
 * One-off: copy integration credentials from .env / .env.local into the
 * AppSetting table. Existing DB values are kept unless --overwrite is passed.
 * After running, remove those keys from .env.
 *
 *   pnpm db:import-credentials [--overwrite]
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const { createPrismaClient } = require("./create-prisma-client");

const KEYS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "DELHIVERY_EMAIL",
  "DELHIVERY_PASSWORD",
];

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const prisma = createPrismaClient();
  try {
    for (const key of KEYS) {
      const value = (process.env[key] || "").trim();
      if (!value) {
        console.log(`  – ${key}: not set in env, skipped`);
        continue;
      }
      const existing = await prisma.appSetting.findUnique({ where: { key } });
      if (existing && !overwrite) {
        console.log(`  – ${key}: already in DB, kept (use --overwrite)`);
        continue;
      }
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      console.log(`  ✅ ${key}: stored in DB`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
