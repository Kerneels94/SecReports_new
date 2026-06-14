/**
 * Augments the Fastify type definitions so that `request.user` is typed
 * across all route handlers with the authenticated user payload.
 */
import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      userId: string;
      role: string;
      companyId: string;
    };
  }
}
