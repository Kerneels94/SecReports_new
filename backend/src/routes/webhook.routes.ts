import { FastifyInstance } from "fastify";
import { PaystackController } from "../controllers/paystack.controller";

export default async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post("/webhooks/paystack", PaystackController.webhook);
}
