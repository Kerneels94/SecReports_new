/**
 * Guarding Site routes — all endpoints require JWT authentication.
 * Role-restricted: create/update (admin/manager), delete (admin).
 */
import { FastifyInstance } from "fastify";
import { GuardingSiteController } from "../controllers/guardingSite.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function guardingSiteRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/guarding-sites", { preHandler: [requirePermission("guarding.view")] }, GuardingSiteController.list);
  fastify.get("/guarding-sites/:id", { preHandler: [requirePermission("guarding.view")] }, GuardingSiteController.getById);
  fastify.post("/guarding-sites", { preHandler: [requirePermission("guarding.manage")] }, GuardingSiteController.create);
  fastify.put("/guarding-sites/:id", { preHandler: [requirePermission("guarding.manage")] }, GuardingSiteController.update);
  fastify.delete("/guarding-sites/:id", { preHandler: [requirePermission("guarding.delete")] }, GuardingSiteController.delete);
}