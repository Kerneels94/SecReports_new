/**
 * Patrol Schedule routes — all endpoints require JWT authentication.
 * Role-restricted: create/update/delete (admin/manager), read (guarding.view).
 */
import { FastifyInstance } from "fastify";
import { PatrolScheduleController } from "../controllers/patrolSchedule.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function patrolScheduleRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/patrol-schedules", { preHandler: [requirePermission("guarding.view")] }, PatrolScheduleController.listByCompany);
  fastify.get("/patrol-schedules/:id", { preHandler: [requirePermission("guarding.view")] }, PatrolScheduleController.getById);
  fastify.post("/patrol-schedules", { preHandler: [requirePermission("guarding.manage")] }, PatrolScheduleController.create);
  fastify.put("/patrol-schedules/:id", { preHandler: [requirePermission("guarding.manage")] }, PatrolScheduleController.update);
  fastify.delete("/patrol-schedules/:id", { preHandler: [requirePermission("guarding.manage")] }, PatrolScheduleController.delete);
}