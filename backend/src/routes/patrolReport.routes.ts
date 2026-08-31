/**
 * Patrol Report routes — all endpoints require JWT authentication.
 * Role-restricted: create/update (admin/manager/guard), delete (admin/manager).
 */
import { FastifyInstance } from "fastify";
import { PatrolReportController } from "../controllers/patrolReport.controller";
import { requireRole } from "../middleware/requireRole";

export default async function patrolReportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/sites/:siteId/patrol-reports", PatrolReportController.listBySite);
  fastify.get("/guards/:guardId/patrol-reports", PatrolReportController.listByGuard);
  fastify.get("/patrol-reports", PatrolReportController.listByCompany);
  fastify.get("/patrol-reports/:id", PatrolReportController.getById);
  fastify.post("/patrol-reports", { preHandler: [requireRole("admin", "manager")] }, PatrolReportController.create);
  fastify.put("/patrol-reports/:id", { preHandler: [requireRole("admin", "manager")] }, PatrolReportController.update);
  fastify.delete("/patrol-reports/:id", { preHandler: [requireRole("admin", "manager")] }, PatrolReportController.delete);
}
