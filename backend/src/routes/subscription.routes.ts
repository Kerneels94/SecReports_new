import { FastifyInstance } from "fastify";
import { SubscriptionController } from "../controllers/subscription.controller";
import { requireRole } from "../middleware/requireRole";

export default async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/subscription/plans", SubscriptionController.listPlans);
  fastify.get("/subscription", SubscriptionController.getSubscription);
  fastify.get("/subscription/billing", SubscriptionController.getBillingDetails);
  fastify.patch("/subscription/plan", {
    preHandler: [requireRole("admin")],
  }, SubscriptionController.changePlan);
}
