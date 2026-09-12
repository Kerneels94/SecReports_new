/**
 * Permission routes — the admin permission-matrix page.
 * GET returns the catalog merged with company overrides; PUT saves toggle changes.
 * Admin-only: deliberately gated by role, not permission, so admins can never lock themselves out.
 */
import { FastifyInstance } from "fastify";
import { getPermissions, updatePermissions } from "../controllers/permission.controller";
import { requireRole } from "../middleware/requireRole";

export default async function permissionRoutes(fastify: FastifyInstance) {
  fastify.get("/admin/permissions", {
    preHandler: [fastify.authenticate, requireRole("admin")],
    handler: getPermissions,
  });

  fastify.put("/admin/permissions", {
    preHandler: [fastify.authenticate, requireRole("admin")],
    handler: updatePermissions,
  });
}