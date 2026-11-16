/**
 * One-off migration: sets the trial to 10 reports, adds/updates Starter (R650, 5 users) and Standard (R850, 8 users),
 * and raises Professional to 10 users.
 * Safe to run more than once.
 * Run: npx tsx prisma/migrate-plan-tiers.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const professional = await prisma.subscriptionPlan.findFirst({ where: { name: "Professional" } });
  if (!professional) throw new Error("Professional plan not found");

  await prisma.subscriptionPlan.update({
    where: { id: professional.id },
    data: { userLimit: 10 },
  });
  console.log("Professional plan — user limit set to 10");

  const free = await prisma.subscriptionPlan.updateMany({ where: { price: 0 }, data: { reportLimit: 10 } });
  console.log(`Updated ${free.count} free plan(s) — report limit set to 10`);

  const tiers = [
    { name: "Starter", price: 65000, userLimit: 5, reportLimit: 25 },
    { name: "Standard", price: 85000, userLimit: 8, reportLimit: 50 },
  ];
  for (const tier of tiers) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: tier.name } });
    if (existing) {
      await prisma.subscriptionPlan.update({ where: { id: existing.id }, data: tier });
      console.log(`${tier.name} plan updated`);
    } else {
      // New tiers get the same features as Professional.
      await prisma.subscriptionPlan.create({ data: { ...tier, features: professional.features } });
      console.log(`${tier.name} plan created`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
