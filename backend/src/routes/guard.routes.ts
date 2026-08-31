/**
 * Guard routes — all endpoints require JWT authentication.
 * Role-restricted: create/update (admin/manager), delete (admin).
 */
import { FastifyInstance } from "fastify";
import { GuardController } from "../controllers/guard.controller";
import { requireRole } from "../middleware/requireRole";

export default async function guardRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/guards", GuardController.list);
  fastify.get("/guards/:id", GuardController.getById);
  fastify.post("/guards", { preHandler: [requireRole("admin", "manager")] }, GuardController.create);
  fastify.put("/guards/:id", { preHandler: [requireRole("admin", "manager")] }, GuardController.update);
  fastify.delete("/guards/:id", { preHandler: [requireRole("admin")] }, GuardController.delete);
}
