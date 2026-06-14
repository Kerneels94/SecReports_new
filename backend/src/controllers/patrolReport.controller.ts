/**
 * Patrol Report controller — manages patrol shift reports for guarding sites.
 * Supports listing by site, guard, or company, and full CRUD operations.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { PatrolReportService } from "../services/patrolReport.service";
import { createPatrolReportSchema, updatePatrolReportSchema } from "../validators/patrolReport.schema";
import { ValidationError } from "../lib/errors";

export const PatrolReportController = {
  /** List patrol reports for a specific guarding site. */
  async listBySite(request: FastifyRequest, reply: FastifyReply) {
    const { siteId } = request.params as { siteId: string };
    const reports = await PatrolReportService.listBySite(siteId);
    reply.code(200).send({ success: true, data: reports });
  },

  /** List patrol reports for the company, with optional date range and site filters. */
  async listByCompany(request: FastifyRequest, reply: FastifyReply) {
    const { siteId, dateFrom, dateTo } = request.query as { siteId?: string; dateFrom?: string; dateTo?: string };
    const reports = await PatrolReportService.listByCompany(request.user!.companyId, { siteId, dateFrom, dateTo });
    reply.code(200).send({ success: true, data: reports });
  },

  /** List patrol reports for a specific guard. */
  async listByGuard(request: FastifyRequest, reply: FastifyReply) {
    const { guardId } = request.params as { guardId: string };
    const reports = await PatrolReportService.listByGuard(guardId);
    reply.code(200).send({ success: true, data: reports });
  },

  /** Get a single patrol report by ID. */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const report = await PatrolReportService.getById(id);
    reply.code(200).send({ success: true, data: report });
  },

  /** Create a new patrol report. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createPatrolReportSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const report = await PatrolReportService.create(parsed.data);
    reply.code(201).send({ success: true, data: report });
  },

  /** Update an existing patrol report. */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updatePatrolReportSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const report = await PatrolReportService.update(id, parsed.data);
    reply.code(200).send({ success: true, data: report });
  },

  /** Delete a patrol report. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await PatrolReportService.delete(id);
    reply.code(204).send();
  },
};
