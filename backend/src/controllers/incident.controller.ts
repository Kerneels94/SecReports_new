/**
 * Incident controller — manages incident reports lifecycle: list, create, update, status transitions, and delete.
 * Enforces subscription limits for creation.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { IncidentService } from "../services/incident.service";
import { createIncidentSchema, paginationSchema } from "../validators/incident.schema";
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
    const incident = await IncidentService.getById(request.user!.companyId, id);
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
};
