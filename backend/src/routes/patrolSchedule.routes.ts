/**
 * Patrol Schedule routes — all endpoints require JWT authentication.
 * Role-restricted: create/update/delete (owner/manager), read (all authenticated).
 */
import { FastifyInstance } from "fastify";
import { PatrolScheduleController } from "../controllers/patrolSchedule.controller";
import { requireRole } from "../middleware/requireRole";

export default async function patrolScheduleRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/patrol-schedules", PatrolScheduleController.listByCompany);
  fastify.get("/patrol-schedules/:id", PatrolScheduleController.getById);
  fastify.post("/patrol-schedules", { preHandler: [requireRole("owner", "manager")] }, PatrolScheduleController.create);
  fastify.put("/patrol-schedules/:id", { preHandler: [requireRole("owner", "manager")] }, PatrolScheduleController.update);
  fastify.delete("/patrol-schedules/:id", { preHandler: [requireRole("owner", "manager")] }, PatrolScheduleController.delete);
}
