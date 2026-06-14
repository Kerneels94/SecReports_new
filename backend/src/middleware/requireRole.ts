/**
 * Role-based access-control hook factory.
 * Returns a preHandler that verifies the authenticated user possesses at
 * least one of the supplied roles.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { ForbiddenError } from "../lib/errors";

/**
 * Factory that returns a preHandler hook enforcing that the authenticated
 * user has one of the specified roles.
 * @param roles - One or more role names permitted to access the route.
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError("Authentication required");
    }
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
  };
}
