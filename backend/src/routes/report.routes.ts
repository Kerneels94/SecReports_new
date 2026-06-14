/**
 * Report routes — protected by JWT authentication.
 * Provides dashboard summary data.
 */
import { FastifyInstance } from "fastify";
import { ReportController } from "../controllers/report.controller";

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/reports/summary", ReportController.summary);
}
