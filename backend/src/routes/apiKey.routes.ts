/**
 * API Key routes — all endpoints require JWT authentication.
 * Supports listing, generating, and revoking API keys.
 */
import { FastifyInstance } from "fastify";
import { ApiKeyController } from "../controllers/apiKey.controller";

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api-keys", ApiKeyController.list);
  fastify.post("/api-keys", ApiKeyController.generate);
  fastify.delete("/api-keys/:id", ApiKeyController.revoke);
}
