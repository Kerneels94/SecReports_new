/**
 * Incident routes — all endpoints require JWT authentication.
 * Supports full CRUD plus status transitions for incident reports.
 */
import { FastifyInstance } from "fastify";
import { IncidentController } from "../controllers/incident.controller";
import { requireRole } from "../middleware/requireRole";

export default async function incidentRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/incidents", IncidentController.list);
  fastify.get("/incidents/:id", IncidentController.getById);
  fastify.post("/incidents", { preHandler: [requireRole("owner", "manager", "guard")] }, IncidentController.create);
  fastify.put("/incidents/:id", { preHandler: [requireRole("owner", "manager")] }, IncidentController.update);
  fastify.patch("/incidents/:id/status", { preHandler: [requireRole("owner", "manager")] }, IncidentController.updateStatus);
  fastify.delete("/incidents/:id", { preHandler: [requireRole("owner", "manager")] }, IncidentController.delete);
}
