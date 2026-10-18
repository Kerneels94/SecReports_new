import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { SubscriptionService } from "../services/subscription.service";
import { ValidationError } from "../lib/errors";

const changePlanSchema = z.object({ planId: z.string().min(1) });

export const SubscriptionController = {
  async listPlans(request: FastifyRequest, reply: FastifyReply) {
    const data = await SubscriptionService.listPlans();
    reply.code(200).send({ success: true, data });
  },

  async getSubscription(request: FastifyRequest, reply: FastifyReply) {
    const data = await SubscriptionService.getSubscription(request.user!.companyId);
    reply.code(200).send({ success: true, data });
  },

  async getBillingDetails(request: FastifyRequest, reply: FastifyReply) {
    const data = await SubscriptionService.getBillingDetails(request.user!.companyId);
    reply.code(200).send({ success: true, data });
  },

  async changePlan(request: FastifyRequest, reply: FastifyReply) {
    const parsed = changePlanSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());
    const data = await SubscriptionService.changePlan(request.user!.companyId, parsed.data.planId);
    reply.code(200).send({ success: true, data });
  },
};
