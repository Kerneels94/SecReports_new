/**
 * API Key controller — lists API keys.
 * All endpoints require authentication.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { ApiKeyService } from "../services/apiKey.service";

export const ApiKeyController = {
  /** List all API keys for the authenticated user's company. */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const keys = await ApiKeyService.list(request.user!.companyId);
    reply.code(200).send({ success: true, data: keys });
  },
};
