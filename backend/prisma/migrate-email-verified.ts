/**
 * One-off migration: sets emailVerified = true for the superadmin user.
 * Run: npx ts-node prisma/migrate-email-verified.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    console.error("SUPER_ADMIN_EMAIL env variable must be set");
    process.exit(1);
  }

  const result = await prisma.user.updateMany({
    where: { email: superAdminEmail },
    data: { emailVerified: true },
  });

  if (result.count > 0) {
    console.log(`Updated ${result.count} superadmin record(s) — emailVerified set to true`);
  } else {
    console.log("No superadmin found to update");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
