/**
 * Investigation routes — all endpoints require JWT authentication.
 * Supports investigation CRUD and corrective action management per incident.
 */
import { FastifyInstance } from "fastify";
import { InvestigationController } from "../controllers/investigation.controller";

export default async function investigationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/incidents/:id/investigation", InvestigationController.get);
  fastify.post("/incidents/:id/investigation", InvestigationController.upsert);
  fastify.get("/incidents/:id/actions", InvestigationController.listActions);
  fastify.post("/incidents/:id/actions", InvestigationController.createAction);
  fastify.patch("/actions/:actionId", InvestigationController.updateAction);
}
