/**
 * Export routes — all endpoints require JWT authentication.
 * Supports CSV and (future) PDF export of incidents.
 */
import { FastifyInstance } from "fastify";
import { ExportController } from "../controllers/export.controller";

export default async function exportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/export/csv", ExportController.csv);
  fastify.get("/export/pdf", ExportController.pdf);
}
