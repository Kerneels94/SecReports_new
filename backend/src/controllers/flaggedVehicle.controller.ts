/**
 * Flagged Vehicle controller — manages flagged vehicle records.
 * Supports listing, creation, resolution, and deletion of flagged vehicles.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { FlaggedVehicleService } from "../services/flaggedVehicle.service";
import { createFlaggedVehicleSchema, resolveFlaggedVehicleSchema } from "../validators/flaggedVehicle.schema";
import { ValidationError } from "../lib/errors";

export const FlaggedVehicleController = {
  /** List flagged vehicles for the company, optionally including resolved ones. */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { includeResolved?: string };
    const vehicles = await FlaggedVehicleService.listByCompany(
      request.user!.companyId,
      query.includeResolved === "true",
    );
    reply.code(200).send({ success: true, data: vehicles });
  },

  /** Get a single flagged vehicle by ID. */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const vehicle = await FlaggedVehicleService.getById(request.user!.companyId, id);
    reply.code(200).send({ success: true, data: vehicle });
  },

  /** Create a new flagged vehicle record. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createFlaggedVehicleSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const vehicle = await FlaggedVehicleService.create({
      companyId: request.user!.companyId,
      vehicleReg: parsed.data.vehicleReg,
      reason: parsed.data.reason,
      flaggedById: request.user!.userId,
      entryLogId: parsed.data.entryLogId,
    });

    reply.code(201).send({ success: true, data: vehicle });
  },

  /** Mark a flagged vehicle as resolved. */
  async resolve(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = resolveFlaggedVehicleSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const vehicle = await FlaggedVehicleService.resolve(request.user!.companyId, id);
    reply.code(200).send({ success: true, data: vehicle });
  },

  /** Delete a flagged vehicle record. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await FlaggedVehicleService.delete(request.user!.companyId, id);
    reply.code(204).send();
  },
};
