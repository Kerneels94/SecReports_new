import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || "localhost",
  user: process.env.DATABASE_USER || "root",
  password: process.env.DATABASE_PASSWORD || "password",
  database: process.env.DATABASE_NAME || "SecReports",
  port: Number(process.env.DATABASE_PORT) || 3306,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.investigation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.incidentPerson.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

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
      role: "admin",
      department: "Management",
    },
  });

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Manager User",
      email: "manager@example.com",
      passwordHash,
      role: "manager",
      department: "Management",
    },
  });

  const investigator = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Investigator User",
      email: "investigator@example.com",
      passwordHash,
      role: "investigator",
      department: "Security",
    },
  });

  const reporter = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Reporter User",
      email: "reporter@example.com",
      passwordHash,
      role: "reporter",
      department: "Operations",
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
      category: "Infrastructure",
      status: "investigating",
      incidentDate: new Date("2026-05-20"),
      location: "Server Room A-12",
      reporterId: reporter.id,
      assignedTo: investigator.id,
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
      userId: reporter.id,
      message: "I noticed the temperature alarm at approximately 14:30.",
    },
  });

  await prisma.comment.create({
    data: {
      incidentId: incident.id,
      userId: investigator.id,
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
      ownerId: investigator.id,
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
      performedBy: reporter.id,
    },
  });

  console.log("Seed completed successfully");
  console.log(`Company: Demo Security Inc.`);
  console.log(`Admin: admin@example.com / password123`);
  console.log(`Manager: manager@example.com / password123`);
  console.log(`Investigator: investigator@example.com / password123`);
  console.log(`Reporter: reporter@example.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
