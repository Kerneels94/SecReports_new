import { FastifyInstance } from "fastify";
import { InvoiceController } from "../controllers/invoice.controller";
import { requireRole } from "../middleware/requireRole";

export default async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/admin/companies", { preHandler: [requireRole("superadmin")] }, InvoiceController.listCompanies);
  fastify.get("/admin/companies/:id", { preHandler: [requireRole("superadmin")] }, InvoiceController.getCompany);

  fastify.get("/admin/invoices", { preHandler: [requireRole("superadmin")] }, InvoiceController.listInvoices);
  fastify.get("/admin/invoices/:id", { preHandler: [requireRole("superadmin")] }, InvoiceController.getInvoice);
  fastify.post("/admin/invoices", { preHandler: [requireRole("superadmin")] }, InvoiceController.createInvoice);
  fastify.post("/admin/invoices/:id/send", { preHandler: [requireRole("superadmin")] }, InvoiceController.sendInvoice);
  fastify.patch("/admin/invoices/:id/paid", { preHandler: [requireRole("superadmin")] }, InvoiceController.markAsPaid);
  fastify.patch("/admin/invoices/:id/overdue", { preHandler: [requireRole("superadmin")] }, InvoiceController.markAsOverdue);
  fastify.post("/admin/invoices/generate-monthly", { preHandler: [requireRole("superadmin")] }, InvoiceController.generateMonthly);

  fastify.get("/admin/revenue", { preHandler: [requireRole("superadmin")] }, InvoiceController.revenueStats);
  fastify.get("/admin/revenue/trends", { preHandler: [requireRole("superadmin")] }, InvoiceController.revenueTrends);
}
