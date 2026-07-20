import { FastifyRequest, FastifyReply } from "fastify";
import { AuditLogService } from "../services/auditLog.service";

export const AuditLogController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { page, perPage, entityType, action, dateFrom, dateTo, search } =
      request.query as Record<string, string | undefined>;

    const data = await AuditLogService.list({
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
      companyId: request.user!.companyId,
      entityType,
      action,
      dateFrom,
      dateTo,
      search,
    });

    reply.code(200).send({ success: true, data });
  },
};
