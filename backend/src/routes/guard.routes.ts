/**
 * Guard routes — all endpoints require JWT authentication.
 * Role-restricted: create/update (admin/manager), delete (admin).
 */
import { FastifyInstance } from "fastify";
import { GuardController } from "../controllers/guard.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function guardRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/guards", { preHandler: [requirePermission("guarding.view")] }, GuardController.list);
  fastify.get("/guards/:id", { preHandler: [requirePermission("guarding.view")] }, GuardController.getById);
  fastify.post("/guards", { preHandler: [requirePermission("guarding.manage")] }, GuardController.create);
  fastify.put("/guards/:id", { preHandler: [requirePermission("guarding.manage")] }, GuardController.update);
  fastify.delete("/guards/:id", { preHandler: [requirePermission("guarding.delete")] }, GuardController.delete);
}