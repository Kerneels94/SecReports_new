/**
 * Incident routes — all endpoints require JWT authentication.
 * Supports full CRUD plus status transitions for incident reports.
 */
import { FastifyInstance } from "fastify";
import { IncidentController } from "../controllers/incident.controller";

export default async function incidentRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/incidents", IncidentController.list);
  fastify.get("/incidents/:id", IncidentController.getById);
  fastify.post("/incidents", IncidentController.create);
  fastify.put("/incidents/:id", IncidentController.update);
  fastify.patch("/incidents/:id/status", IncidentController.updateStatus);
  fastify.delete("/incidents/:id", IncidentController.delete);
}
