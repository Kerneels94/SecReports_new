/**
 * Entry Log controller — manages vehicle/person entry logs at guarding sites.
 * Supports CRUD operations and flagging vehicles from an entry log record.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { EntryLogService } from "../services/entryLog.service";
import { createEntryLogSchema, updateEntryLogSchema, flagVehicleSchema } from "../validators/entryLog.schema";
import { ValidationError } from "../lib/errors";
import { FlaggedVehicleService } from "../services/flaggedVehicle.service";

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

    const log = await EntryLogService.create(parsed.data);

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

  /** Flag a vehicle from an entry log as a flagged vehicle. */
  async flagVehicle(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = flagVehicleSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const vehicle = await FlaggedVehicleService.create({
      companyId: request.user!.companyId,
      vehicleReg: parsed.data.vehicleReg,
      reason: parsed.data.reason,
      flaggedById: request.user!.userId,
      entryLogId: id,
    });

    reply.code(201).send({ success: true, data: vehicle });
  },

  /** Delete an entry log. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await EntryLogService.delete(request.user!.companyId, id);
    reply.code(204).send();
  },
};
