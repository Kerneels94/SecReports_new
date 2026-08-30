/**
 * Dev utility: mark the free trial as ended for a company so the trial-expired
 * flows can be tested (manager/senior blocked at login, admin upgrade modal).
 *
 * Usage: npx tsx prisma/mock-trial-ending.ts test6@gmail.com
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx prisma/mock-trial-ending.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.companyId) {
    console.error(`No user found with email "${email}" (or they have no company).`);
    process.exit(1);
  }

  const sub = await prisma.companySubscription.findUnique({
    where: { companyId: user.companyId },
    include: { plan: true },
  });
  if (!sub) {
    console.error("No subscription found for this company.");
    process.exit(1);
  }

  if (sub.plan.price > 0) {
    console.error(
      `Subscription is on plan "${sub.plan.name}" (paid) - trial flows only apply to the free plan.`,
    );
    process.exit(1);
  }

  const trialEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const updated = await prisma.companySubscription.update({
    where: { companyId: user.companyId },
    data: {
      trialStartedAt: sub.trialStartedAt ?? new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      trialEndsAt,
      trialWarningSent: false,
    },
    include: { plan: true },
  });

  console.log("Trial ended. Summary:");
  console.log("  user        :", user.email, `(${user.role})`);
  console.log("  companyId   :", user.companyId);
  console.log("  plan        :", updated.plan.name);
  console.log("  trialStartedAt:", updated.trialStartedAt?.toISOString());
  console.log("  trialEndsAt  :", updated.trialEndsAt?.toISOString(), "(expired)");
  console.log();
  console.log("Expected behaviour on next login:");
  console.log("  - admin/superadmin: login succeeds; SubscriptionModal opens on the dashboard");
  console.log("  - manager/senior  : login is rejected with the trial-ended message");
  console.log("  - ALL feature APIs return 403 FORBIDDEN until the company subscribes");
  console.log("  - Only /subscription* and /auth/me routes remain accessible (upgrade flow)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });