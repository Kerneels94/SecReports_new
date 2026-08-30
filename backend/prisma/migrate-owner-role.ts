/**
 * One-off migration: renames the `owner` user role to `admin`.
 * Existing users with role "owner" are updated so they keep their
 * administrative access under the new role name.
 * Run: npx tsx prisma/migrate-owner-role.ts
 *
 * Note: uses a raw MongoDB update because the new Prisma client runtime
 * rejects "owner" as an out-of-enum value in typed queries.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = (await prisma.$runCommandRaw({
    update: "users",
    updates: [{ q: { role: "owner" }, u: { $set: { role: "admin" } }, multi: true }],
  })) as { n?: number; nModified?: number };

  const updated = result.nModified ?? result.n ?? 0;
  if (updated > 0) {
    console.log(`Updated ${updated} user(s) — role "owner" → "admin"`);
  } else {
    console.log("No users with the \"owner\" role found to update");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});