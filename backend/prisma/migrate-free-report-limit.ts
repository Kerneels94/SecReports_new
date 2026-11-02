/**
 * One-off migration: caps the free trial plan at 50 incident reports.
 * Run: npx tsx prisma/migrate-free-report-limit.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.subscriptionPlan.updateMany({
    where: { price: 0 },
    data: { reportLimit: 50 },
  });

  console.log(`Updated ${result.count} free plan(s) — report limit set to 50`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
