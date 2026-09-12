/**
 * Entry Log routes — all endpoints require JWT authentication.
 * Role-restricted: create, update, flag, resolve, delete (admin/manager); read (guarding.view).
 */
import { FastifyInstance } from "fastify";
import { EntryLogController } from "../controllers/entryLog.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function entryLogRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/sites/:siteId/entry-logs", { preHandler: [requirePermission("guarding.view")] }, EntryLogController.listBySite);
  fastify.get("/entry-logs", { preHandler: [requirePermission("guarding.view")] }, EntryLogController.listByCompany);
  fastify.get("/entry-logs/:id", { preHandler: [requirePermission("guarding.view")] }, EntryLogController.getById);
  fastify.post("/entry-logs", { preHandler: [requirePermission("guarding.manage")] }, EntryLogController.create);
  fastify.put("/entry-logs/:id", { preHandler: [requirePermission("guarding.manage")] }, EntryLogController.update);
  fastify.post("/entry-logs/:id/flag", { preHandler: [requirePermission("guarding.manage")] }, EntryLogController.flag);
  fastify.post("/entry-logs/:id/resolve", { preHandler: [requirePermission("guarding.manage")] }, EntryLogController.resolve);
  fastify.delete("/entry-logs/:id", { preHandler: [requirePermission("guarding.manage")] }, EntryLogController.delete);
}