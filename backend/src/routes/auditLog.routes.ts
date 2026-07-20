import { FastifyInstance } from "fastify";
import { AuditLogController } from "../controllers/auditLog.controller";
import { requireRole } from "../middleware/requireRole";

export default async function auditLogRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/audit-logs", { preHandler: [requireRole("owner", "manager")] }, AuditLogController.list);
}
