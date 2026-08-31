/**
 * Report routes — protected by JWT authentication.
 * Provides dashboard summary data and emailing of reports.
 */
import { FastifyInstance } from "fastify";
import { ReportController } from "../controllers/report.controller";
import { ExportController } from "../controllers/export.controller";
import { requireRole } from "../middleware/requireRole";

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/reports/summary", { preHandler: [requireRole("admin", "manager", "senior")] }, ReportController.summary);
  fastify.post("/reports/email", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requireRole("admin", "manager", "senior")],
  }, ExportController.email);
  fastify.post("/reports/batch-email", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [requireRole("admin", "manager", "senior")],
  }, ExportController.batchEmail);
}
