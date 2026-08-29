/**
 * Guarding Site routes — all endpoints require JWT authentication.
 * Role-restricted: create/update (admin/manager), delete (admin).
 */
import { FastifyInstance } from "fastify";
import { GuardingSiteController } from "../controllers/guardingSite.controller";
import { requireRole } from "../middleware/requireRole";

export default async function guardingSiteRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/guarding-sites", GuardingSiteController.list);
  fastify.get("/guarding-sites/:id", GuardingSiteController.getById);
  fastify.post("/guarding-sites", { preHandler: [requireRole("admin", "manager")] }, GuardingSiteController.create);
  fastify.put("/guarding-sites/:id", { preHandler: [requireRole("admin", "manager")] }, GuardingSiteController.update);
  fastify.delete("/guarding-sites/:id", { preHandler: [requireRole("admin")] }, GuardingSiteController.delete);
}
