import { FastifyRequest, FastifyReply } from "fastify";
import { AuditLogService } from "../services/auditLog.service";
import { paginationSchema } from "../validators/incident.schema";
import { ValidationError } from "../lib/errors";

export const AuditLogController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { entityType, action, dateFrom, dateTo, search } =
      request.query as Record<string, string | undefined>;

    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.flatten());
    const { page, perPage } = parsed.data;

    const data = await AuditLogService.list({
      page,
      perPage,
      companyId: request.user!.companyId,
      entityType,
      action,
      dateFrom,
      dateTo,
      search,
    });

    reply.code(200).send({ success: true, data });
  },

  /** Superadmin listing across every company, optionally filtered to one. */
  async adminList(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, entityType, action, dateFrom, dateTo, search } =
      request.query as Record<string, string | undefined>;

    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.flatten());
    const { page, perPage } = parsed.data;

    const data = await AuditLogService.list({
      page,
      perPage,
      companyId: companyId || null,
      entityType,
      action,
      dateFrom,
      dateTo,
      search,
    });

    reply.code(200).send({ success: true, data });
  },
};
