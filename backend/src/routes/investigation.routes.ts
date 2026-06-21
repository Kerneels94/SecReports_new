/**
 * Investigation routes — all endpoints require JWT authentication.
 * Supports investigation CRUD and corrective action management per incident.
 */
import { FastifyInstance } from "fastify";
import { InvestigationController } from "../controllers/investigation.controller";
import { requireRole } from "../middleware/requireRole";

export default async function investigationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/incidents/:id/investigation", InvestigationController.get);
  fastify.get("/incidents/:id/actions", InvestigationController.listActions);
  fastify.post("/incidents/:id/investigation", { preHandler: [requireRole("owner", "manager")] }, InvestigationController.upsert);
  fastify.post("/incidents/:id/actions", { preHandler: [requireRole("owner", "manager")] }, InvestigationController.createAction);
  fastify.patch("/actions/:actionId", { preHandler: [requireRole("owner", "manager")] }, InvestigationController.updateAction);
}
