import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionService } from "../services/subscription.service";

export function requireFeature(feature: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    await SubscriptionService.requireFeature(request.user!.companyId, feature);
  };
}
