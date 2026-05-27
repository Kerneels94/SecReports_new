import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionService } from "../services/subscription.service";
import { ValidationError } from "../lib/errors";
import { z } from "zod";
import { PaystackService } from "../services/paystack.service";

const upgradeSchema = z.object({
  planId: z.number().int().positive(),
});

export const PaystackController = {
  async getSubscription(request: FastifyRequest, reply: FastifyReply) {
    const subscription = await SubscriptionService.getSubscription(request.user!.companyId);
    reply.code(200).send({ success: true, data: subscription });
  },

  async upgrade(request: FastifyRequest, reply: FastifyReply) {
    const parsed = upgradeSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await SubscriptionService.initializeUpgrade(
      request.user!.companyId,
      parsed.data.planId
    );

    reply.code(200).send({ success: true, data: result });
  },

  async callback(request: FastifyRequest, reply: FastifyReply) {
    const { reference } = request.query as { reference?: string };
    if (!reference) throw new ValidationError("Missing reference");

    await SubscriptionService.handleUpgradeCallback(reference);

    reply.redirect(`${process.env.APP_URL || "http://localhost:3000"}/settings/billing?success=true`);
  },

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    const subscription = await SubscriptionService.cancelSubscription(request.user!.companyId);
    reply.code(200).send({ success: true, data: subscription });
  },

  async history(request: FastifyRequest, reply: FastifyReply) {
    const payments = await SubscriptionService.getPaymentHistory(request.user!.companyId);
    reply.code(200).send({ success: true, data: payments });
  },

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    const signature = request.headers["x-paystack-signature"] as string;
    const body = JSON.stringify(request.body);

    if (!PaystackService.verifyWebhook(signature, body)) {
      reply.code(401).send({ success: false, error: "Invalid signature" });
      return;
    }

    const event = request.body as { event: string; data: Record<string, any> };
    reply.code(200).send({ success: true });
  },
};
