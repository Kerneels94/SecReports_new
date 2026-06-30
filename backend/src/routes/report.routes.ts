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

  fastify.get("/reports/summary", { preHandler: [requireRole("owner", "manager", "senior")] }, ReportController.summary);
  fastify.post("/reports/email", { preHandler: [requireRole("owner", "manager")] }, ExportController.email);
  fastify.post("/reports/batch-email", { preHandler: [requireRole("owner", "manager")] }, ExportController.batchEmail);
}
