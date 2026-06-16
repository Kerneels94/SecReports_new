import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  await prisma.patrolCheckpoint.deleteMany();
  await prisma.patrolReport.deleteMany();
  await prisma.entryLog.deleteMany();
  await prisma.flaggedVehicle.deleteMany();
  await prisma.guard.deleteMany();
  await prisma.guardingSite.deleteMany();
  await prisma.paymentHistory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.companySubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.investigation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.incidentPerson.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const allFeatures = JSON.stringify([
    "basic_crud", "status_changes", "email_notifications",
    "export_csv_pdf", "priority_support",
    "full_lifecycle", "api_access",
  ]);

  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Free",
      price: 0,
      siteLimit: 5,
      userLimit: 1,
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

  const passwordHash = await bcrypt.hash("password123", 12);

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
      role: "owner",
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
      operatorName: "Admin User",
      dispatcher: "Manager User",
      reporterId: admin.id,
      assignedTo: senior.id,
      people: {
        create: [
          {
            name: "John Witness",
            role: "witness",
            contact: "john@example.com",
            notes: "Was in the adjacent room when alarm went off",
          },
        ],
      },
    },
    include: { people: true },
  });

  await prisma.comment.create({
    data: {
      incidentId: incident.id,
      userId: senior.id,
      message: "I noticed the temperature alarm at approximately 14:30.",
    },
  });

  await prisma.comment.create({
    data: {
      incidentId: incident.id,
      userId: admin.id,
      message: "I will inspect the HVAC system in the morning.",
    },
  });

  await prisma.investigation.create({
    data: {
      incidentId: incident.id,
      findings: "Preliminary inspection shows a failed cooling fan in the main AC unit.",
      rootCause: "Fan motor bearing failure due to lack of maintenance.",
      recommendations: "Replace fan motor and implement quarterly maintenance schedule.",
    },
  });

  await prisma.correctiveAction.create({
    data: {
      incidentId: incident.id,
      description: "Replace failed cooling fan motor",
      ownerId: senior.id,
      dueDate: new Date("2026-06-01"),
      status: "in_progress",
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

  const flagged = await prisma.flaggedVehicle.create({
    data: {
      companyId: company.id,
      vehicleReg: "BK 789-012 GP",
      reason: "Suspicious activity reported at Riverside site",
      flaggedById: guard1.id,
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
      flaggedVehicleId: flagged.id,
    },
  });

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "corriebotha64@gmail.com";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "superadmintest1234";
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
      },
    });
  }

  console.log("Seed completed successfully");
  console.log(`Company: Demo Security Inc.`);
  console.log(`Admin: admin@example.com / password123`);
  console.log(`Manager: manager@example.com / password123`);
  console.log(`Senior: senior@example.com / password123`);

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
