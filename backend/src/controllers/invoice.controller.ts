import { FastifyRequest, FastifyReply } from "fastify";
import { InvoiceService } from "../services/invoice.service";
import { createInvoiceSchema } from "../validators/invoice.schema";
import { ValidationError } from "../lib/errors";

export const InvoiceController = {
  async listInvoices(request: FastifyRequest, reply: FastifyReply) {
    const { status, companyId, dateFrom, dateTo } = request.query as Record<string, string | undefined>;
    const data = await InvoiceService.getInvoices({ status, companyId, dateFrom, dateTo });
    reply.code(200).send({ success: true, data });
  },

  async getInvoice(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await InvoiceService.getInvoiceById(id);
    reply.code(200).send({ success: true, data });
  },

  async createInvoice(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createInvoiceSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());
    const data = await InvoiceService.createInvoice(parsed.data);
    reply.code(201).send({ success: true, data });
  },

  async sendInvoice(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await InvoiceService.sendInvoice(id);
    reply.code(200).send({ success: true, data });
  },

  async markAsPaid(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await InvoiceService.markAsPaid(id);
    reply.code(200).send({ success: true, data });
  },

  async markAsOverdue(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await InvoiceService.markAsOverdue(id);
    reply.code(200).send({ success: true, data });
  },

  async generateMonthly(request: FastifyRequest, reply: FastifyReply) {
    const data = await InvoiceService.generateMonthlyInvoices();
    reply.code(200).send({ success: true, data });
  },

  async revenueStats(request: FastifyRequest, reply: FastifyReply) {
    const data = await InvoiceService.getRevenueStats();
    reply.code(200).send({ success: true, data });
  },

  async revenueTrends(request: FastifyRequest, reply: FastifyReply) {
    const data = await InvoiceService.getRevenueTrends();
    reply.code(200).send({ success: true, data });
  },

  async listCompanies(request: FastifyRequest, reply: FastifyReply) {
    const data = await InvoiceService.getCompanies();
    reply.code(200).send({ success: true, data });
  },

  async getCompany(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await InvoiceService.getCompanyById(id);
    reply.code(200).send({ success: true, data });
  },
};
