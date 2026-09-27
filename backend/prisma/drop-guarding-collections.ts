/**
 * One-off migration: drops the guarding-domain collections removed from schema.prisma.
 * MongoDB has no schema migrations, so the collections survive after the models are deleted.
 * Run ONCE against every environment: npx ts-node prisma/drop-guarding-collections.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COLLECTIONS = [
  "patrol_schedule_checkpoints",
  "patrol_schedule_time_slots",
  "patrol_schedules",
  "patrol_checkpoints",
  "patrol_reports",
  "entry_logs",
  "guards",
  "guarding_sites",
] as const;

async function main() {
  for (const name of COLLECTIONS) {
    await prisma.$runCommandRaw({ drop: name });
    console.log(`Dropped collection '${name}'`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Drop failed:", err);
  process.exit(1);
});
