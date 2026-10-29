import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  try { await prisma.paymentHistory.deleteMany(); } catch(e) {}
  try { await prisma.invoice.deleteMany(); } catch(e) {}
  try { await prisma.companySubscription.deleteMany(); } catch(e) {}
  try { await prisma.ledger.deleteMany(); } catch(e) {}
  try { await prisma.auditLog.deleteMany(); } catch(e) {}
  try { await prisma.incident.deleteMany(); } catch(e) {}
  try { await prisma.user.updateMany({ data: { createdBy: null } }); } catch(e) {}
  try { await prisma.user.deleteMany(); } catch(e) {}
  try { await prisma.company.deleteMany(); } catch(e) {}
  try { await prisma.companyPermission.deleteMany(); } catch(e) {}

  const allFeatures = JSON.stringify(["basic_crud", "status_changes", "email_notifications", "export_csv_pdf", "priority_support", "api_access"]);
  let freePlan = await prisma.subscriptionPlan.findFirst({ where: { name: "Free" } });
  if (!freePlan) {
    freePlan = await prisma.subscriptionPlan.create({ data: { name: "Free", price: 0, userLimit: 0, trialPeriodDays: 14, features: allFeatures } });
  }

  const demoPassword = "Password@1234";
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const company = await prisma.company.create({ data: { name: "FakeCo Security", email: "fakeco1793206504531@example.com" } });
  const admin = await prisma.user.create({ data: { companyId: company.id, name: "Admin User", email: "admin1793206504531@fakeco.com", passwordHash, role: "admin", emailVerified: true, status: "active" } });
  const manager = await prisma.user.create({ data: { companyId: company.id, name: "Manager User", email: "manager1793206504531@fakeco.com", passwordHash, role: "manager", emailVerified: true, status: "active" } });
  const senior = await prisma.user.create({ data: { companyId: company.id, name: "Senior User", email: "senior1793206504531@fakeco.com", passwordHash, role: "senior", emailVerified: true, status: "active" } });

  await prisma.companySubscription.create({ data: { companyId: company.id, planId: freePlan.id, status: "active", trialStartedAt: new Date(), trialEndsAt: new Date(Date.now() + (freePlan.trialPeriodDays || 14) * 24 * 60 * 60 * 1000) } });

  const areas = ["Durban Central", "Umhlanga", "Pinetown", "Westville", "Chatsworth", "Berea", "Glenwood", "Morningside", "Newlands East", "Phoenix", "Verulam", "Ballito", "Hillcrest", "Amanzimtoti", "Bluff", "Kloof", "Queensburgh", "Reservoir Hills"];
  const types = ["attempted", "positive"];
  const statuses = ["investigating", "in_progress", "resolved", "closed", "draft"];
  const operators = [admin.name, manager.name, senior.name];
  const dispatchers = [manager.name, senior.name, admin.name];

  for (let i = 1; i <= 100; i++) {
    const area = areas[(i-1)%areas.length];
    const type = types[(i-1)%types.length];
    const status = statuses[(i-1)%statuses.length];
    const monthOffset = Math.floor((i-1)/10)%12;
    const dayOffset = ((i-1)%28)+1;
    const incidentDate = new Date(2026, monthOffset, dayOffset, 8 + (i%12), (i*7)%60);
    const dispatchMins = Math.floor(Math.random()*60)+3;
    const arrivalMins = dispatchMins + Math.floor(Math.random()*90)+5;
    const reporter = i%3===0 ? manager : i%3===1 ? senior : admin;
    const assigned = i%4===0 ? null : i%4===1 ? senior.id : i%4===2 ? manager.id : admin.id;

    await prisma.incident.create({
      data: {
        companyId: company.id,
        referenceNumber: "INC-2026-" + String(i).padStart(4, "0"),
        title: "Incident " + i + " - " + type.replace("_", " "),
        description: "Incident " + i + " in " + area + ". Dispatched in " + dispatchMins + " min, arrived in " + arrivalMins + " min.",
        type,
        status,
        incidentDate,
        location: area + " - " + String.fromCharCode(65 + (i%26)) + (i%100),
        suburb: area,
        city: "Durban",
        operatorName: operators[(i-1)%operators.length],
        dispatcher: dispatchers[(i-1)%dispatchers.length],
        dispatchTime: new Date(incidentDate.getTime() + dispatchMins*60000),
        arrivalTime: new Date(incidentDate.getTime() + arrivalMins*60000),
        callSign: "CS-" + String(i).padStart(3,"0"),
        propertyAddress: (100+i) + " " + area + " Road",
        clientName: "Client " + i,
        reporterId: reporter.id,
        assignedTo: assigned,
      },
    });
  }

  console.log("Done");
  console.log("Company: " + company.name + " (" + company.email + ") - Free trial");
  console.log("Users: admin@fakeco.com/manager@fakeco.com/senior@fakeco.com - Password@1234");
  console.log("Incidents: 100 created");
}

main().catch((e)=>{console.error(e);process.exit(1);}).finally(async()=>{await prisma.$disconnect();});
