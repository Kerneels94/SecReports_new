/**
 * Patrol Report routes — all endpoints require JWT authentication.
 * Role-restricted: create/update/delete (admin/manager), read (guarding.view).
 */
import { FastifyInstance } from "fastify";
import { PatrolReportController } from "../controllers/patrolReport.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function patrolReportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/sites/:siteId/patrol-reports", { preHandler: [requirePermission("guarding.view")] }, PatrolReportController.listBySite);
  fastify.get("/guards/:guardId/patrol-reports", { preHandler: [requirePermission("guarding.view")] }, PatrolReportController.listByGuard);
  fastify.get("/patrol-reports", { preHandler: [requirePermission("guarding.view")] }, PatrolReportController.listByCompany);
  fastify.get("/patrol-reports/:id", { preHandler: [requirePermission("guarding.view")] }, PatrolReportController.getById);
  fastify.post("/patrol-reports", { preHandler: [requirePermission("guarding.manage")] }, PatrolReportController.create);
  fastify.put("/patrol-reports/:id", { preHandler: [requirePermission("guarding.manage")] }, PatrolReportController.update);
  fastify.delete("/patrol-reports/:id", { preHandler: [requirePermission("guarding.manage")] }, PatrolReportController.delete);
}