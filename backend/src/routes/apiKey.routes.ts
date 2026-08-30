/**
 * API Key routes — all endpoints require JWT authentication.
 * Supports listing, generating, and revoking API keys.
 */
import { FastifyInstance } from "fastify";
import { ApiKeyController } from "../controllers/apiKey.controller";
import { requireRole } from "../middleware/requireRole";

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api-keys", ApiKeyController.list);
  fastify.post("/api-keys", { preHandler: [requireRole("admin", "manager")] }, ApiKeyController.generate);
  fastify.delete("/api-keys/:id", { preHandler: [requireRole("admin", "manager")] }, ApiKeyController.revoke);
}
