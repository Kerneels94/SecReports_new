/**
 * Incident routes — all endpoints require JWT authentication.
 * Supports full CRUD plus status transitions for incident reports.
 */
import { FastifyInstance } from "fastify";
import { IncidentController } from "../controllers/incident.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function incidentRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/incidents", { preHandler: [requirePermission("incidents.view")] }, IncidentController.list);
  fastify.get("/incidents/:id", { preHandler: [requirePermission("incidents.view")] }, IncidentController.getById);
  fastify.post("/incidents", { preHandler: [requirePermission("incidents.create")] }, IncidentController.create);
}