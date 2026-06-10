import { FastifyRequest, FastifyReply } from "fastify";
import { ApiKeyService } from "../services/apiKey.service";
import { SubscriptionService } from "../services/subscription.service";
import { ValidationError } from "../lib/errors";
import { z } from "zod";

const generateSchema = z.object({
  name: z.string().min(1).max(255),
});

export const ApiKeyController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const keys = await ApiKeyService.list(request.user!.companyId);
    reply.code(200).send({ success: true, data: keys });
  },

  async generate(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "api_access");

    const parsed = generateSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const key = await ApiKeyService.generate(request.user!.companyId, parsed.data.name);
    reply.code(201).send({ success: true, data: key });
  },

  async revoke(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await ApiKeyService.revoke(id, request.user!.companyId);
    reply.code(204).send();
  },
};
