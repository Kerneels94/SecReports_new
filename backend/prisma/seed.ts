import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentHistory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.companySubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.updateMany({ data: { createdBy: null } });
  await prisma.user.deleteMany();
  await prisma.companyPermission.deleteMany();
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
      reportLimit: 0,
      trialPeriodDays: 14,
      features: allFeatures,
    },
  });

  const professionalPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Professional",
      price: 150000,
      userLimit: 5,
      reportLimit: 100,
      features: allFeatures,
      highlighted: true,
    },
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: "Enterprise",
      price: 450000,
      userLimit: 0,
      reportLimit: 0,
      features: allFeatures,
    },
  });

  const demoPassword = "Password@1234";
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
      emailVerified: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Manager User",
      email: "manager@example.com",
      passwordHash,
      role: "manager",
      emailVerified: true,
    },
  });

  const senior = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Senior User",
      email: "senior@example.com",
      passwordHash,
      role: "senior",
      emailVerified: true,
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

  const areas = ["Durban Central", "Umhlanga", "Pinetown", "Westville", "Chatsworth", "Berea", "Glenwood", "Morningside", "Newlands East", "Phoenix", "Verulam", "Ballito", "Hillcrest", "Amanzimtoti", "Bluff"];
  const types = ["attempted", "positive"];
  const statuses = ["investigating", "in_progress", "resolved", "closed", "draft"];
  const operators = ["Admin User", "Manager User", "Senior User"];
  const dispatchers = ["Manager User", "Senior User", "Admin User"];
  

  for (let i = 1; i <= 200; i++) {
    const areaIdx = i - 1;
    const area = areas[areaIdx % areas.length];
    const date = new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000);
    const dispatchMins = Math.floor(Math.random() * 45) + 5;
    const arrivalMins = dispatchMins + Math.floor(Math.random() * 60) + 10;
    await prisma.incident.create({
      data: {
        companyId: company.id,
        referenceNumber: `INC-2026-${String(i).padStart(4, '0')}`,
        title: `Incident Report ${i} - ${types[areaIdx % types.length].replace('_', ' ')}`,
        description: `Detailed incident report ${i}: Response time varied between calls. Units dispatched after ${dispatchMins} minutes, arrived after ${arrivalMins} minutes from initial report. Incident occurred in ${area} area requiring investigation and follow-up actions with full documentation.`,
        type: types[areaIdx % types.length],
        status: statuses[areaIdx % statuses.length],
        incidentDate: date,
        location: `${area} - Site ${String.fromCharCode(65 + (areaIdx % 26))}${(areaIdx % 9) + 1}`,
        suburb: area,
        city: "Durban",
        operatorName: operators[areaIdx % operators.length],
        dispatcher: dispatchers[areaIdx % dispatchers.length],
        dispatchTime: new Date(date.getTime() + dispatchMins * 60000),
        arrivalTime: new Date(date.getTime() + arrivalMins * 60000),
        callSign: `ALPHA-${i}`,
        propertyAddress: `${i * 10} Main Road, ${area}`,
        clientName: `Client ${i}`,
        reporterId: admin.id,
        assignedTo: [senior.id, manager.id, null][areaIdx % 3],
      },
    });
  }
  // const incident = await prisma.incident.findFirst();

  const firstIncident = await prisma.incident.findFirst({ where: { companyId: company.id } });
  if (firstIncident) {
    await prisma.auditLog.create({
      data: {
        entityType: "incident",
        entityId: firstIncident.id,
        action: "create",
        newValues: JSON.stringify({ title: firstIncident.title }),
        performedBy: admin.id,
      },
    });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
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

  console.log(`Super Admin: ${superAdminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
