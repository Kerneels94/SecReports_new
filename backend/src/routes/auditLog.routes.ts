import { FastifyInstance } from "fastify";
import { AuditLogController } from "../controllers/auditLog.controller";
import { requirePermission } from "../middleware/requirePermission";
import { requireRole } from "../middleware/requireRole";

export default async function auditLogRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/audit-logs", { preHandler: [requirePermission("auditLogs.view")] }, AuditLogController.list);
  fastify.get("/audit-logs/export", { preHandler: [requirePermission("auditLogs.view")] }, AuditLogController.exportOwnCompany);
  fastify.get("/admin/audit-logs", { preHandler: [requireRole("superadmin")] }, AuditLogController.adminList);
  fastify.post("/admin/audit-logs/export", { preHandler: [requireRole("superadmin")] }, AuditLogController.exportCompany);
  fastify.post("/admin/audit-logs/export/:companyId", { preHandler: [requireRole("superadmin")] }, AuditLogController.exportCompany);
}
