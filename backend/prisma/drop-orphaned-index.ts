/**
 * Run this script ONCE to drop the orphaned `guards_user_id_key`
 * unique index from MongoDB.
 *
 * Usage: npx tsx prisma/drop-orphaned-index.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Dropping orphaned index `guards_user_id_key` from guards collection...");
  try {
    await prisma.$runCommandRaw({
      dropIndexes: "guards",
      index: "guards_user_id_key",
    });
    console.log("Successfully dropped orphaned index. Guard creation should now work.");
  } catch (err: any) {
    if (err?.code === "P2010" || String(err?.message ?? "").includes("index not found")) {
      console.log("Index already removed — nothing to do.");
    } else {
      console.error("Failed to drop index:", err.message ?? err);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
