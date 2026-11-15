/**
 * One-off: sets coordinates on incidents saved without a map pin (e.g. seeded ones),
 * so they show on the dashboard hotspot map. Safe to re-run: it only touches incidents
 * that still have no coordinates.
 * Run: npx tsx prisma/backfill-coordinates.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { backfillCoordinates } from "../src/lib/backfillCoordinates";

const prisma = new PrismaClient();

backfillCoordinates(prisma)
  .then((r) => {
    console.log(`Updated ${r.updated} incidents. ${r.noArea} had no area to look up.`);
    if (r.notFound.length) console.log(`Not found (${r.notFound.length}):\n  ${r.notFound.join("\n  ")}`);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
