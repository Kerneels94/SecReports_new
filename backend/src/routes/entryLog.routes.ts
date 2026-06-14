/**
 * Entry Log routes — all endpoints require JWT authentication.
 * Role-restricted: create, update, flag (owner/manager/guard); delete (owner/manager).
 */
import { FastifyInstance } from "fastify";
import { EntryLogController } from "../controllers/entryLog.controller";
import { requireRole } from "../middleware/requireRole";

export default async function entryLogRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/sites/:siteId/entry-logs", EntryLogController.listBySite);
  fastify.get("/entry-logs", EntryLogController.listByCompany);
  fastify.get("/entry-logs/:id", EntryLogController.getById);
  fastify.post("/entry-logs", { preHandler: [requireRole("owner", "manager", "guard")] }, EntryLogController.create);
  fastify.put("/entry-logs/:id", { preHandler: [requireRole("owner", "manager", "guard")] }, EntryLogController.update);
  fastify.post("/entry-logs/:id/flag", { preHandler: [requireRole("owner", "manager", "guard")] }, EntryLogController.flagVehicle);
  fastify.delete("/entry-logs/:id", { preHandler: [requireRole("owner", "manager")] }, EntryLogController.delete);
}
