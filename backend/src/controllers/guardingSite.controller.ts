import { FastifyRequest, FastifyReply } from "fastify";
import { GuardingSiteService } from "../services/guardingSite.service";
import { createGuardingSiteSchema, updateGuardingSiteSchema } from "../validators/guardingSite.schema";
import { ValidationError } from "../lib/errors";

export const GuardingSiteController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const sites = await GuardingSiteService.list(request.user!.companyId);
    reply.code(200).send({ success: true, data: sites });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const site = await GuardingSiteService.getById(id);
    reply.code(200).send({ success: true, data: site });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createGuardingSiteSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const site = await GuardingSiteService.create({
      ...parsed.data,
      companyId: request.user!.companyId,
    });

    reply.code(201).send({ success: true, data: site });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const parsed = updateGuardingSiteSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const site = await GuardingSiteService.update(id, parsed.data);
    reply.code(200).send({ success: true, data: site });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await GuardingSiteService.delete(id);
    reply.code(204).send();
  },
};
