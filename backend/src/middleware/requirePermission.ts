/**
 * Permission-based access-control hook factory.
 * Returns a preHandler that denies access unless the authenticated user's role
 * is granted that permission (company override if present, else catalog default).
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { ForbiddenError } from "../lib/errors";
import { prisma } from "../lib/db";
import { defaultRoles } from "../lib/permissions";

/**
 * Factory that returns a preHandler hook enforcing that the authenticated
 * user's role is granted `permissionKey` for their company.
 * # ponytail: reads CompanyPermission on every request; add a small in-memory
 * company-scoped cache if request throughput ever matters.
 */
export function requirePermission(permissionKey: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError("Authentication required");
    }

    const { companyId, role } = request.user;
    const override = await prisma.companyPermission.findUnique({
      where: { companyId_permission: { companyId, permission: permissionKey } },
    });

    const granted = override ? override.roles : defaultRoles(permissionKey);
    if (!granted.includes(role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
  };
}