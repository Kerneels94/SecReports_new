import { FastifyInstance } from "fastify";
import { SubscriptionController } from "../controllers/subscription.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/subscription/plans", SubscriptionController.listPlans);
  fastify.get("/subscription", SubscriptionController.getSubscription);
  fastify.get("/subscription/billing", SubscriptionController.getBillingDetails);
  fastify.patch("/subscription/plan", {
    preHandler: [requirePermission("billing.manage")],
  }, SubscriptionController.changePlan);
}
