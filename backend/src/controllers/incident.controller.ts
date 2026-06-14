/**
 * Incident controller — manages incident reports lifecycle: list, create, update, status transitions, and delete.
 * Enforces subscription limits for creation.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { IncidentService } from "../services/incident.service";
import {
  createIncidentSchema,
  updateIncidentSchema,
  updateStatusSchema,
  paginationSchema,
} from "../validators/incident.schema";
import { ValidationError } from "../lib/errors";
import { SubscriptionService } from "../services/subscription.service";

export const IncidentController = {
  /** List incidents with pagination, filtered by company and user role. */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = paginationSchema.safeParse(request.query);
    if (!query.success) throw new ValidationError("Invalid query", query.error.flatten());

    const result = await IncidentService.list({
      ...query.data,
      companyId: request.user!.companyId,
      userId: request.user!.userId,
      role: request.user!.role,
    });

    reply.code(200).send({ success: true, data: result });
  },

  /** Get a single incident by ID. */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const incident = await IncidentService.getById(id);
    reply.code(200).send({ success: true, data: incident });
  },

  /** Create a new incident report. */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createIncidentSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const incident = await IncidentService.create({
      ...parsed.data,
      companyId: request.user!.companyId,
      reporterId: request.user!.userId,
    });

    reply.code(201).send({ success: true, data: incident });
  },

  /** Update an existing incident. Role-based access is enforced. */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updateIncidentSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const incident = await IncidentService.update(
      id,
      parsed.data,
      request.user!.userId,
      request.user!.role,
    );

    reply.code(200).send({ success: true, data: incident });
  },

  /** Transition an incident's status (e.g., open -> investigating -> resolved). */
  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const incident = await IncidentService.updateStatus(
      id,
      parsed.data.status,
      request.user!.userId,
    );

    reply.code(200).send({ success: true, data: incident });
  },

  /** Delete an incident. Role-based access is enforced. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await IncidentService.delete(id, request.user!.userId, request.user!.role);
    reply.code(204).send();
  },
};
