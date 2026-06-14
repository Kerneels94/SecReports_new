/**
 * Subscription feature-gating hook factory.
 * Returns a preHandler that checks whether the authenticated user's company
 * has an active subscription that includes the required feature.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionService } from "../services/subscription.service";

/**
 * Factory that returns a preHandler hook verifying that the authenticated
 * user's company has an active subscription covering the named feature.
 * @param feature - The subscription feature key to check.
 */
export function requireFeature(feature: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    await SubscriptionService.requireFeature(request.user!.companyId, feature);
  };
}
