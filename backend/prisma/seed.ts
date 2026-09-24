import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  await prisma.patrolScheduleCheckpoint.deleteMany();
  await prisma.patrolScheduleTimeSlot.deleteMany();
  await prisma.patrolSchedule.deleteMany();
  await prisma.patrolCheckpoint.deleteMany();
  await prisma.patrolReport.deleteMany();
  await prisma.entryLog.deleteMany();
  await prisma.guard.deleteMany();
  await prisma.guardingSite.deleteMany();
  await prisma.paymentHistory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.companySubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.apiKey.deleteMany();
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
      siteLimit: 0,
      userLimit: 0,
      trialPeriodDays: 14,
      features: allFeatures,
    },
  });

  const professionalPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Professional",
      price: 150000,
      siteLimit: 15,
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

  // Guarding seed data
  const site1 = await prisma.guardingSite.create({
    data: { companyId: company.id, name: "Riverside Industrial Park", address: "42 Riverside Rd, Industria" },
  });

  const site2 = await prisma.guardingSite.create({
    data: { companyId: company.id, name: "Sunset Mall", address: "100 Sunset Blvd, Central" },
  });

  const guard1 = await prisma.guard.create({
    data: {
      companyId: company.id,
      siteId: site1.id,
      name: "Thabo",
      surname: "Molefe",
      cellphone: "0821234567",
      employeeId: "GRD-001",
    },
  });

  const guard2 = await prisma.guard.create({
    data: {
      companyId: company.id,
      siteId: site2.id,
      name: "Lerato",
      surname: "Ndlovu",
      cellphone: "0839876543",
      employeeId: "GRD-002",
    },
  });

  await prisma.patrolReport.create({
    data: {
      siteId: site1.id,
      guardId: guard1.id,
      startedAt: new Date("2026-06-12T22:00:00Z"),
      completedAt: new Date("2026-06-13T06:00:00Z"),
      status: "completed",
      notes: "All clear. No incidents.",
      checkpoints: {
        create: [
          { name: "Main Gate", scannedAt: new Date("2026-06-12T22:15:00Z"), status: "ok" },
          { name: "Warehouse A", scannedAt: new Date("2026-06-12T23:00:00Z"), status: "ok" },
          { name: "Parking Lot", scannedAt: new Date("2026-06-13T00:30:00Z"), status: "ok" },
          { name: "Back Fence", scannedAt: new Date("2026-06-13T02:00:00Z"), status: "ok" },
          { name: "Main Gate", scannedAt: new Date("2026-06-13T05:45:00Z"), status: "ok" },
        ],
      },
    },
  });

  await prisma.entryLog.create({
    data: {
      siteId: site1.id,
      guardId: guard1.id,
      driverName: "James Delivery",
      driverContact: "0725551234",
      vehicleReg: "CF 123-456 GP",
      vehicleDesc: "White Toyota Hino truck",
      entryTime: new Date("2026-06-13T08:30:00Z"),
      purpose: "Goods delivery",
    },
  });

  await prisma.entryLog.create({
    data: {
      siteId: site2.id,
      guardId: guard2.id,
      driverName: "Unknown",
      vehicleReg: "BK 789-012 GP",
      vehicleDesc: "Silver Volkswagen Golf",
      entryTime: new Date("2026-06-13T14:00:00Z"),
      purpose: "Unverified",
      flagged: true,
      flagReason: "Suspicious activity reported at Riverside site",
      flaggedById: guard1.id,
      flaggedAt: new Date("2026-06-13T14:05:00Z"),
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
