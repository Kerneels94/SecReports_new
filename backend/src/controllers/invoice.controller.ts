import { FastifyRequest, FastifyReply } from "fastify";
import { InvoiceService } from "../services/invoice.service";

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
    const body = request.body as {
      companyId: string;
      amount: number;
      currency?: string;
      dueDate: string;
      periodStart?: string;
      periodEnd?: string;
      description?: string;
    };
    const data = await InvoiceService.createInvoice({
      ...body,
      dueDate: new Date(body.dueDate),
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
    });
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
