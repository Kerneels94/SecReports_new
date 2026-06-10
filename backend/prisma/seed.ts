import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentHistory.deleteMany();
  await prisma.companySubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.investigation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.incidentPerson.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const starterPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Starter",
      price: 0,
      reportLimit: 20,
      userLimit: 1,
      features: JSON.stringify(["basic_crud", "status_changes", "email_notifications"]),
    },
  });

  const professionalPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Professional",
      price: 80000,
      reportLimit: 50,
      userLimit: 5,
      features: JSON.stringify(["basic_crud", "status_changes", "email_notifications", "evidence_uploads", "export_csv_pdf", "priority_support"]),
      highlighted: true,
    },
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: "Enterprise",
      price: 150000,
      reportLimit: 0,
      userLimit: 0,
      features: JSON.stringify(["basic_crud", "status_changes", "email_notifications", "evidence_uploads", "export_csv_pdf", "priority_support", "full_lifecycle", "api_access"]),
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
      planId: starterPlan.id,
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
      severity: "high",
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
      newValues: JSON.stringify({ title: incident.title, severity: incident.severity }),
      performedBy: admin.id,
    },
  });

  console.log("Seed completed successfully");
  console.log(`Company: Demo Security Inc.`);
  console.log(`Admin: admin@example.com / password123`);
  console.log(`Manager: manager@example.com / password123`);
  console.log(`Senior: senior@example.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
