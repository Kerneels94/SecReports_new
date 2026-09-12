/**
 * API Key routes — all endpoints require JWT authentication.
 * Supports listing, generating, and revoking API keys.
 */
import { FastifyInstance } from "fastify";
import { ApiKeyController } from "../controllers/apiKey.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api-keys", ApiKeyController.list);
  fastify.post("/api-keys", { preHandler: [requirePermission("apiKeys.manage")] }, ApiKeyController.generate);
  fastify.delete("/api-keys/:id", { preHandler: [requirePermission("apiKeys.manage")] }, ApiKeyController.revoke);
}