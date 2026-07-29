import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionService } from "../services/subscription.service";

export const SubscriptionController = {
  async listPlans(request: FastifyRequest, reply: FastifyReply) {
    const data = await SubscriptionService.listPlans();
    reply.code(200).send({ success: true, data });
  },

  async getSubscription(request: FastifyRequest, reply: FastifyReply) {
    const data = await SubscriptionService.getSubscription(request.user!.companyId);
    reply.code(200).send({ success: true, data });
  },

  async changePlan(request: FastifyRequest, reply: FastifyReply) {
    const { planId } = request.body as { planId: string };
    const data = await SubscriptionService.changePlan(request.user!.companyId, planId);
    reply.code(200).send({ success: true, data });
  },
};
