/**
 * Fastify plugin that decorates every request with a `user` property and
 * exposes an `authenticate` decorator on the server instance for route
 * pre-handler protection.
 */
import { FastifyInstance } from "fastify";
import { verifyAccessToken } from "../lib/jwt";
import { UnauthorizedError } from "../lib/errors";

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("user", undefined);

  fastify.decorate("authenticate", async (request: any) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid token");
    }

    const token = header.substring(7);
    try {
      const payload = verifyAccessToken(token);
      request.user = { userId: payload.userId, role: payload.role };
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  });
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any) => Promise<void>;
  }
}
