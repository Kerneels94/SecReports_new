/**
 * Report routes — protected by JWT authentication.
 * Provides dashboard summary data and emailing of reports.
 */
import { FastifyInstance } from "fastify";
import { ReportController } from "../controllers/report.controller";
import { ExportController } from "../controllers/export.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get(
    "/reports/summary",
    { preHandler: [requirePermission("reports.view")] },
    ReportController.summary,
  );
  fastify.get(
    "/reports/monthly-stats",
    { preHandler: [requirePermission("reports.view")] },
    ReportController.monthlyStats,
  );
  fastify.get(
    "/reports/monthly-response",
    { preHandler: [requirePermission("reports.view")] },
    ReportController.monthlyResponse,
  );
  fastify.get(
    "/reports/response-by-area",
    { preHandler: [requirePermission("reports.view")] },
    ReportController.responseByArea,
  );
  fastify.post(
    "/reports/email",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [requirePermission("export.reports")],
    },
    ExportController.email,
  );
  fastify.post(
    "/reports/batch-email",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [requirePermission("export.reports")],
    },
    ExportController.batchEmail,
  );
}
