import { FastifyInstance } from "fastify";
import { GuardController } from "../controllers/guard.controller";
import { requireRole } from "../middleware/requireRole";

export default async function guardRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/guards", GuardController.list);
  fastify.get("/guards/:id", GuardController.getById);
  fastify.post("/guards", { preHandler: [requireRole("owner", "manager")] }, GuardController.create);
  fastify.put("/guards/:id", { preHandler: [requireRole("owner", "manager")] }, GuardController.update);
  fastify.delete("/guards/:id", { preHandler: [requireRole("owner")] }, GuardController.delete);
}
