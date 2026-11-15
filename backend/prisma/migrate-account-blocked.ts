/**
 * One-off migration: backfills account_blocked = 0 and wrong_password_tries = 0
 * on users created before those fields existed.
 *
 * MongoDB does not apply Prisma @default to existing documents, and the block
 * in AuthService.login is guarded on `accountBlocked: 0`, which never matches a
 * missing field. Without this, old accounts count wrong passwords but are never
 * blocked and never get the unblock email.
 *
 * Only documents missing a field are touched, so it is safe to re-run and never
 * unblocks an account that is already blocked.
 *
 * Run: npx tsx prisma/migrate-account-blocked.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

/** Sets `field` to 0 on every user document that lacks it; returns the count changed. */
async function backfill(field: string): Promise<number> {
  const result = (await prisma.$runCommandRaw({
    update: "users",
    updates: [
      { q: { [field]: { $exists: false } }, u: { $set: { [field]: 0 } }, multi: true },
    ],
  })) as { nModified?: number };
  return result.nModified ?? 0;
}

async function main() {
  const blocked = await backfill("account_blocked");
  const tries = await backfill("wrong_password_tries");
  console.log(`account_blocked set to 0 on ${blocked} user(s)`);
  console.log(`wrong_password_tries set to 0 on ${tries} user(s)`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
