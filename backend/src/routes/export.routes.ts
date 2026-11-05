/**
 * Export routes — all endpoints require JWT authentication.
 * Supports CSV and PDF export of incidents.
 */
import { FastifyInstance } from "fastify";
import { ExportController } from "../controllers/export.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function exportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/export/csv", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requirePermission("export.csv")],
  }, ExportController.csv);
  fastify.get("/export/yearly-pdf", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requirePermission("export.reports")],
  }, ExportController.yearlyPdf);
  fastify.get("/export/response-time-pdf", {
    // Same ceiling as the other generated-document routes: each hit loads up to 12 months of
    // incidents and renders a PDF, so the global 100/min is too generous for a download button.
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requirePermission("export.reports")],
    schema: {
      querystring: {
        type: "object",
        properties: {
          months: { type: "integer", enum: [3, 6, 9, 12] },
        },
      },
    },
  }, ExportController.responseTimePdf);
  fastify.get("/export/monthly-crime-pdf", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requirePermission("export.reports")],
    schema: {
      querystring: {
        type: "object",
        required: ["from", "to"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
        },
      },
    },
  }, ExportController.monthlyCrimePdf);
  fastify.get("/export/pdf", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requirePermission("export.csv")],
    schema: {
      querystring: {
        type: "object",
        required: ["incidentId"],
        properties: {
          incidentId: { type: "string" },
        },
      },
    },
  }, ExportController.pdf);
}