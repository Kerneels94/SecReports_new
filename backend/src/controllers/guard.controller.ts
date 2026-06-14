/**
 * Guard controller — manages guard profiles within a company.
 * Supports listing (with optional site filter), CRUD operations.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { GuardService } from "../services/guard.service";
import {
  createGuardSchema,
  updateGuardSchema,
} from "../validators/guard.schema";
import { ValidationError } from "../lib/errors";

export const GuardController = {
  /** List guards for the company, optionally filtered by site. */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { siteId?: string };
    const guards = await GuardService.list(
      request.user!.companyId,
      query.siteId,
    );
    reply.code(200).send({ success: true, data: guards });
  },

  /** Get a single guard by ID. */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const guard = await GuardService.getById(id);
    reply.code(200).send({ success: true, data: guard });
  },

  /** Create a new guard profile within the company. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createGuardSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    const guard = await GuardService.create({
      ...parsed.data,
      companyId: request.user!.companyId,
    });

    reply.code(201).send({ success: true, data: guard });
  },

  /** Update an existing guard's details. */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updateGuardSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    const guard = await GuardService.update(id, parsed.data);
    reply.code(200).send({ success: true, data: guard });
  },

  /** Delete a guard profile. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await GuardService.delete(id);
    reply.code(204).send();
  },
};
