import { FastifyInstance } from "fastify";
import { PaystackController } from "../controllers/paystack.controller";

export default async function paystackRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/payments/subscription", PaystackController.getSubscription);
  fastify.post("/payments/upgrade", PaystackController.upgrade);
  fastify.post("/payments/cancel", PaystackController.cancel);
  fastify.get("/payments/history", PaystackController.history);
  fastify.get("/payments/callback", PaystackController.callback);
}
