import { FastifyRequest, FastifyReply } from "fastify";
import { ApiKeyService } from "../services/apiKey.service";
import { UnauthorizedError } from "../lib/errors";

export async function apiKeyAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const header = request.headers["x-api-key"] as string;
  if (!header) throw new UnauthorizedError("Missing API key");

  const apiKey = await ApiKeyService.validate(header);
  if (!apiKey) throw new UnauthorizedError("Invalid or inactive API key");

  request.user = {
    userId: "0",
    role: "api",
    companyId: apiKey.companyId,
  };
}
