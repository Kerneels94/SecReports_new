/**
 * Patrol Schedule controller — manages patrol route templates for guarding sites.
 * Supports listing by company with filters and full CRUD operations.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { PatrolScheduleService } from "../services/patrolSchedule.service";
import { createPatrolScheduleSchema, updatePatrolScheduleSchema } from "../validators/patrolSchedule.schema";
import { ValidationError } from "../lib/errors";

export const PatrolScheduleController = {
  /** List patrol schedules for the company, with optional site/day filters. */
  async listByCompany(request: FastifyRequest, reply: FastifyReply) {
    const { siteId, day } = request.query as { siteId?: string; day?: string };
    const schedules = await PatrolScheduleService.listByCompany(request.user!.companyId, { siteId, day });
    reply.code(200).send({ success: true, data: schedules });
  },

  /** Get a single patrol schedule by ID. */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const schedule = await PatrolScheduleService.getById(request.user!.companyId, id);
    reply.code(200).send({ success: true, data: schedule });
  },

  /** Create a new patrol schedule. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createPatrolScheduleSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const schedule = await PatrolScheduleService.create(request.user!.companyId, {
      ...parsed.data,
      performedBy: request.user!.userId,
    });
    reply.code(201).send({ success: true, data: schedule });
  },

  /** Update an existing patrol schedule. */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updatePatrolScheduleSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const schedule = await PatrolScheduleService.update(request.user!.companyId, id, {
      ...parsed.data,
      performedBy: request.user!.userId,
    });
    reply.code(200).send({ success: true, data: schedule });
  },

  /** Delete a patrol schedule. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await PatrolScheduleService.delete(request.user!.companyId, id, request.user!.userId);
    reply.code(204).send();
  },
};
