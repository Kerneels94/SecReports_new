/**
 * One-off migration: lower-cases stored emails so they match the lower-cased
 * input the auth validators now produce. Without it, users stored with capitals
 * (e.g. "John@acme.co.za") cannot log in or reset their password.
 * Rows whose lower-cased email already belongs to another row are skipped and
 * listed, so duplicate accounts can be merged by hand.
 * Run: npx tsx prisma/migrate-lowercase-emails.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const companies = await prisma.company.findMany({ select: { id: true, email: true } });
  const tokens = await prisma.passwordResetToken.findMany({ select: { id: true, email: true } });

  const userEmails = new Set(users.map((u) => u.email));
  const companyEmails = new Set(companies.map((c) => c.email));
  const skipped: string[] = [];
  let updated = 0;

  for (const u of users) {
    const lower = u.email.toLowerCase();
    if (lower === u.email) continue;
    if (userEmails.has(lower)) {
      skipped.push(`user ${u.id}: ${u.email} (clashes with ${lower})`);
      continue;
    }
    await prisma.user.update({ where: { id: u.id }, data: { email: lower } });
    userEmails.add(lower);
    updated++;
  }

  for (const c of companies) {
    const lower = c.email.toLowerCase();
    if (lower === c.email) continue;
    if (companyEmails.has(lower)) {
      skipped.push(`company ${c.id}: ${c.email} (clashes with ${lower})`);
      continue;
    }
    await prisma.company.update({ where: { id: c.id }, data: { email: lower } });
    companyEmails.add(lower);
    updated++;
  }

  // Not unique, so no clash check; keeps pending reset links working.
  for (const t of tokens) {
    const lower = t.email.toLowerCase();
    if (lower === t.email) continue;
    await prisma.passwordResetToken.update({ where: { id: t.id }, data: { email: lower } });
    updated++;
  }

  console.log(`Lower-cased ${updated} email(s)`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} clashing record(s) — merge these by hand:`);
    for (const line of skipped) console.log(`  ${line}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
