import { FastifyInstance } from "fastify";
import { EvidenceController } from "../controllers/evidence.controller";

export default async function evidenceRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/incidents/:id/evidence", EvidenceController.upload);
  fastify.delete("/incidents/:id/evidence/:evidenceId", EvidenceController.delete);
}
