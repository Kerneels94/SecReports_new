import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentHistory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.companySubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.updateMany({ where: { createdBy: { not: null } }, data: { createdBy: null } });
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const allFeatures = JSON.stringify([
    "basic_crud", "status_changes", "email_notifications",
    "export_csv_pdf", "priority_support",
    "api_access",
  ]);

  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Free",
      price: 0,
      userLimit: 0,
      trialPeriodDays: 14,
      features: allFeatures,
    },
  });

  const professionalPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Professional",
      price: 150000,
      userLimit: 5,
      features: allFeatures,
      highlighted: true,
    },
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: "Enterprise",
      price: 450000,
      siteLimit: 0,
      userLimit: 0,
      features: allFeatures,
    },
  });

  // Demo credentials come from env (optionally) or are randomly generated and
  // printed once — never a hardcoded default password (golden rule #30).
  const demoPassword =
    process.env.DEMO_PASSWORD || crypto.randomBytes(16).toString("base64url");
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const company = await prisma.company.create({
    data: {
      name: "Demo Security Inc.",
      email: "admin@example.com",
    },
  });

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Admin User",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
    },
  });

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Manager User",
      email: "manager@example.com",
      passwordHash,
      role: "manager",
    },
  });

  const senior = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Senior User",
      email: "senior@example.com",
      passwordHash,
      role: "senior",
    },
  });

  await prisma.companySubscription.create({
    data: {
      companyId: company.id,
      planId: freePlan.id,
      status: "active",
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + freePlan.trialPeriodDays! * 24 * 60 * 60 * 1000),
    },
  });

  const incident = await prisma.incident.create({
    data: {
      companyId: company.id,
      referenceNumber: "INC-2026-0001",
      title: "Server Room Temperature Spike",
      description: "Temperature in server room A-12 exceeded safe threshold for 15 minutes.",
      type: "equipment_failure",
      status: "investigating",
      incidentDate: new Date("2026-05-20"),
      location: "Server Room A-12",
      suburb: "Umhlanga",
      city: "Durban",
      operatorName: "Admin User",
      dispatcher: "Manager User",
      reporterId: admin.id,
      assignedTo: senior.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "incident",
      entityId: incident.id,
      action: "create",
      newValues: JSON.stringify({ title: incident.title }),
      performedBy: admin.id,
    },
  });

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!superAdminEmail || !superAdminPassword) {
    console.error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set");
    process.exit(1);
  }
  const existingSuperAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!existingSuperAdmin) {
    const superAdminHash = await bcrypt.hash(superAdminPassword, 12);
    await prisma.user.create({
      data: {
        name: "Super Admin",
        email: superAdminEmail,
        passwordHash: superAdminHash,
        role: "superadmin",
        status: "active",
        emailVerified: true,
      },
    });
  }

  console.log("Seed completed successfully");
  console.log(`Company: Demo Security Inc.`);
  console.log(`Admin: admin@example.com / ${demoPassword}`);
  console.log(`Manager: manager@example.com / ${demoPassword}`);
  console.log(`Senior: senior@example.com / ${demoPassword}`);

  console.log(`Super Admin: ${superAdminEmail} / ${superAdminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
