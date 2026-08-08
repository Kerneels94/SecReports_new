/**
 * Export routes — all endpoints require JWT authentication.
 * Supports CSV and PDF export of incidents and patrol reports.
 */
import { FastifyInstance } from "fastify";
import { ExportController } from "../controllers/export.controller";
import { PatrolExportController } from "../controllers/patrolExport.controller";
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

  fastify.get("/export/patrol-reports/csv", {
    preHandler: [requireRole("owner", "manager")],
    schema: {
      querystring: {
        type: "object",
        properties: {
          siteId: { type: "string" },
          dateFrom: { type: "string" },
          dateTo: { type: "string" },
        },
      },
    },
  }, PatrolExportController.csv);

  fastify.get("/export/patrol-reports/pdf", {
    preHandler: [requireRole("owner", "manager")],
    schema: {
      querystring: {
        type: "object",
        properties: {
          siteId: { type: "string" },
          dateFrom: { type: "string" },
          dateTo: { type: "string" },
          siteName: { type: "string" },
        },
      },
    },
  }, PatrolExportController.pdf);

  fastify.post("/reports/patrol-reports/email", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requireRole("owner", "manager", "senior")],
  }, PatrolExportController.email);
}
