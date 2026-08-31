/**
 * Entry Log controller — manages vehicle/person entry logs at guarding sites.
 * Supports CRUD, flagging, and unflagging.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { EntryLogService } from "../services/entryLog.service";
import { createEntryLogSchema, updateEntryLogSchema, flagSchema, resolveSchema } from "../validators/entryLog.schema";
import { ValidationError } from "../lib/errors";

export const EntryLogController = {
  /** List entry logs for a specific guarding site. */
  async listBySite(request: FastifyRequest, reply: FastifyReply) {
    const { siteId } = request.params as { siteId: string };
    const logs = await EntryLogService.listBySite(request.user!.companyId, siteId);
    reply.code(200).send({ success: true, data: logs });
  },

  /** List all entry logs for the authenticated user's company. */
  async listByCompany(request: FastifyRequest, reply: FastifyReply) {
    const logs = await EntryLogService.listByCompany(request.user!.companyId);
    reply.code(200).send({ success: true, data: logs });
  },

  /** Get a single entry log by ID. */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const log = await EntryLogService.getById(request.user!.companyId, id);
    reply.code(200).send({ success: true, data: log });
  },

  /** Create a new entry log. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createEntryLogSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const log = await EntryLogService.create(request.user!.companyId, {
      ...parsed.data,
      flaggedById: parsed.data.flagged ? request.user!.userId : undefined,
    });

    reply.code(201).send({ success: true, data: log });
  },

  /** Update an existing entry log. */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updateEntryLogSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const log = await EntryLogService.update(request.user!.companyId, id, parsed.data);
    reply.code(200).send({ success: true, data: log });
  },

  /** Flag an entry log as suspicious. */
  async flag(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = flagSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const log = await EntryLogService.flag(request.user!.companyId, id, request.user!.userId, parsed.data.reason);
    reply.code(200).send({ success: true, data: log });
  },

  /** Unflag (resolve) an entry log. */
  async resolve(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = resolveSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const log = await EntryLogService.resolve(request.user!.companyId, id, parsed.data.reason);
    reply.code(200).send({ success: true, data: log });
  },

  /** Delete an entry log. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await EntryLogService.delete(request.user!.companyId, id);
    reply.code(204).send();
  },
};
