/**
 * Permission matrix controller — returns the full role×permission matrix and
 * persists an admin's toggle changes.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { PermissionService } from "../services/permission.service";
import { ValidationError } from "../lib/errors";
import { z } from "zod";

// Shape only; the service checks keys and roles against the catalog.
const updateSchema = z.object({
  permissions: z
    .array(z.object({ key: z.string(), roles: z.array(z.string()).max(10) }))
    .max(50),
});

interface UpdateBody {
  permissions: { key: string; roles: string[] }[];
}

/**
 * GET /admin/permissions — full matrix for the caller's company.
 * Returns the catalog with default roles plus any saved overrides.
 */
export async function getPermissions(request: FastifyRequest, reply: FastifyReply) {
  const companyId = request.user!.companyId;
  const matrix = await PermissionService.getForCompany(companyId);
  return reply.send({ success: true, data: matrix });
}

/**
 * PUT /admin/permissions — replace the company's override set.
 * Body: { permissions: [{ key, roles }] } — one entry per permission.
 */
export async function updatePermissions(request: FastifyRequest<{ Body: UpdateBody }>, reply: FastifyReply) {
  const companyId = request.user!.companyId;
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError("Body must include a permissions array");
  }

  const matrix = await PermissionService.updateForCompany(companyId, parsed.data.permissions);
  return reply.send({ success: true, data: matrix, message: "Permissions updated" });
}