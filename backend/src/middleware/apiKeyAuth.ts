/**
 * API-key-based authentication hook.
 *
 * Reads the `x-api-key` header, validates it against the database, and
 * populates `request.user` with a synthetic API identity.
 *
 * **Access scope:** The synthetic `"api"` role is NOT included in any
 * route's `requireRole()` allow-list, so API-key-authenticated requests
 * are limited to read-only GET endpoints (those protected by `authenticate`
 * alone, without `requireRole()`).
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { ApiKeyService } from "../services/apiKey.service";
import { UnauthorizedError } from "../lib/errors";

/**
 * PreHandler hook that authenticates a request via an API key.
 * Expects the key in the `x-api-key` header; on success, sets
 * `request.user` with a synthetic role of "api".
 */
export async function apiKeyAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const header = request.headers["x-api-key"];
  if (typeof header !== "string") {
    throw new UnauthorizedError("Missing API key");
  }

  const apiKey = await ApiKeyService.validate(header);
  if (!apiKey) throw new UnauthorizedError("Invalid or inactive API key");

  request.user = {
    userId: apiKey.id,
    role: "api",
    companyId: apiKey.companyId,
  };
}
