import { FastifyRequest, FastifyReply } from "fastify";
import { LedgerService, LedgerActor } from "../services/ledger.service";
import {
  createLedgerEntrySchema,
  ledgerListQuerySchema,
} from "../validators/ledger.schema";
import { ValidationError } from "../lib/errors";
import { validationErrorMessage } from "../validators/shared";

const actorOf = (request: FastifyRequest): LedgerActor => ({
  userId: request.user!.userId,
  role: request.user!.role,
});

export const LedgerController = {
  async listEntries(request: FastifyRequest, reply: FastifyReply) {
    const parsed = ledgerListQuerySchema.safeParse(request.query);
    if (!parsed.success)
      throw new ValidationError(validationErrorMessage(parsed.error), parsed.error.flatten());

    const data = await LedgerService.getEntries(parsed.data, actorOf(request));
    reply.code(200).send({ success: true, data });
  },

  async getEntry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await LedgerService.getEntryById(id, actorOf(request));
    reply.code(200).send({ success: true, data });
  },

  async createEntry(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createLedgerEntrySchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(validationErrorMessage(parsed.error), parsed.error.flatten());

    const data = await LedgerService.postEntry(
      {
        companyId: parsed.data.companyId,
        entryType: parsed.data.entryType,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        description: parsed.data.description,
        reference: parsed.data.reference,
        postedAt: parsed.data.postedAt
          ? new Date(parsed.data.postedAt)
          : undefined,
      },
      actorOf(request),
    );
    reply.code(201).send({ success: true, data });
  },

  async voidEntry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await LedgerService.voidEntry(id, actorOf(request));
    reply.code(200).send({ success: true, data });
  },

  async summary(request: FastifyRequest, reply: FastifyReply) {
    const data = await LedgerService.getSummary(actorOf(request));
    reply.code(200).send({ success: true, data });
  },
};
