/**
 * Report routes — protected by JWT authentication.
 * Provides dashboard summary data.
 */
import { FastifyInstance } from "fastify";
import { ReportController } from "../controllers/report.controller";
import { requireRole } from "../middleware/requireRole";

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/reports/summary", { preHandler: [requireRole("owner", "manager")] }, ReportController.summary);
}
