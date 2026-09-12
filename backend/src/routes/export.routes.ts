/**
 * Export routes — all endpoints require JWT authentication.
 * Supports CSV and PDF export of incidents and patrol reports.
 */
import { FastifyInstance } from "fastify";
import { ExportController } from "../controllers/export.controller";
import { PatrolExportController } from "../controllers/patrolExport.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function exportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/export/csv", { preHandler: [requirePermission("export.csv")] }, ExportController.csv);
  fastify.get("/export/yearly-pdf", { preHandler: [requirePermission("export.reports")] }, ExportController.yearlyPdf);
  fastify.get("/export/pdf", {
    preHandler: [requirePermission("export.csv")],
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
    preHandler: [requirePermission("export.csv")],
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
    preHandler: [requirePermission("export.csv")],
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
    preHandler: [requirePermission("export.reports")],
  }, PatrolExportController.email);
}