import { FastifyRequest, FastifyReply } from "fastify";
import { IncidentService } from "../services/incident.service";
import {
  createIncidentSchema,
  updateIncidentSchema,
  updateStatusSchema,
  paginationSchema,
} from "../validators/incident.schema";
import { ValidationError } from "../lib/errors";

export const IncidentController = {
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

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const incident = await IncidentService.getById(Number(id));
    reply.code(200).send({ success: true, data: incident });
  },

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

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updateIncidentSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const incident = await IncidentService.update(
      Number(id),
      parsed.data,
      request.user!.userId,
      request.user!.role,
    );

    reply.code(200).send({ success: true, data: incident });
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const incident = await IncidentService.updateStatus(
      Number(id),
      parsed.data.status,
      request.user!.userId,
    );

    reply.code(200).send({ success: true, data: incident });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await IncidentService.delete(Number(id), request.user!.userId, request.user!.role);
    reply.code(204).send();
  },
};
