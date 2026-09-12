import { FastifyInstance } from "fastify";
import { AuditLogController } from "../controllers/auditLog.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function auditLogRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/audit-logs", { preHandler: [requirePermission("auditLogs.view")] }, AuditLogController.list);
}
