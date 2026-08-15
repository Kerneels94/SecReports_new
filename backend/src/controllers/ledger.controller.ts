import { FastifyRequest, FastifyReply } from "fastify";
import { LedgerService } from "../services/ledger.service";

export const LedgerController = {
  async listEntries(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, entryType, status, dateFrom, dateTo } =
      request.query as Record<string, string | undefined>;
    const data = await LedgerService.getEntries({
      companyId,
      entryType,
      status,
      dateFrom,
      dateTo,
    });
    reply.code(200).send({ success: true, data });
  },

  async getEntry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await LedgerService.getEntryById(id);
    reply.code(200).send({ success: true, data });
  },

  async createEntry(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as {
      companyId: string;
      entryType: string;
      amount: number;
      currency?: string;
      description?: string;
      reference?: string;
      postedAt?: string;
    };
    const data = await LedgerService.postEntry({
      companyId: body.companyId,
      entryType: body.entryType,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      reference: body.reference,
      postedAt: body.postedAt ? new Date(body.postedAt) : undefined,
    });
    reply.code(201).send({ success: true, data });
  },

  async voidEntry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await LedgerService.voidEntry(id);
    reply.code(200).send({ success: true, data });
  },

  async summary(request: FastifyRequest, reply: FastifyReply) {
    const data = await LedgerService.getSummary();
    reply.code(200).send({ success: true, data });
  },
};
