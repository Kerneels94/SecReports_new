/**
 * Export routes — all endpoints require JWT authentication.
 * Supports CSV and (future) PDF export of incidents.
 */
import { FastifyInstance } from "fastify";
import { ExportController } from "../controllers/export.controller";
import { requireRole } from "../middleware/requireRole";

export default async function exportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/export/csv", { preHandler: [requireRole("owner", "manager")] }, ExportController.csv);
  fastify.get("/export/pdf", {
    preHandler: [requireRole("owner", "manager")],
    schema: {
      querystring: {
        type: "object",
        properties: {
          incidentId: { type: "string" },
        },
      },
    },
  }, ExportController.pdf);
}
