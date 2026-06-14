import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";
import { sendMail } from "./email.service";

export const InvoiceService = {
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${year}-` } },
      orderBy: { invoiceNumber: "desc" },
    });
    let nextSeq = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split("-");
      nextSeq = parseInt(parts[2], 10) + 1;
    }
    return `INV-${year}-${String(nextSeq).padStart(4, "0")}`;
  },

  async createInvoice(data: {
    companyId: string;
    amount: number;
    currency?: string;
    dueDate: Date;
    periodStart?: Date;
    periodEnd?: Date;
    description?: string;
  }) {
    const invoiceNumber = await this.generateInvoiceNumber();
    return prisma.invoice.create({
      data: {
        companyId: data.companyId,
        invoiceNumber,
        amount: data.amount,
        currency: data.currency || "ZAR",
        status: "draft",
        dueDate: data.dueDate,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        description: data.description,
      },
      include: { company: true },
    });
  },

  async getInvoices(filters?: {
    status?: string;
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.dateFrom || filters?.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) createdAt.lte = new Date(filters.dateTo);
      where.createdAt = createdAt;
    }
    return prisma.invoice.findMany({
      where,
      include: { company: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, email: true } },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundError("Invoice");
    return invoice;
  },

  async sendInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!invoice) throw new NotFoundError("Invoice");
    if (invoice.status !== "draft") throw new ConflictError("Invoice already sent");

    await prisma.invoice.update({
      where: { id },
      data: { status: "sent" },
    });

    await sendMail({
      to: invoice.company.email,
      subject: "invoice",
      data: {
        companyName: invoice.company.name,
        amount: invoice.amount,
        currency: invoice.currency,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return prisma.invoice.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true, email: true } } },
    });
  },

  async markAsPaid(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!invoice) throw new NotFoundError("Invoice");
    if (invoice.status === "paid") throw new ConflictError("Invoice already paid");

    const [updated] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      }),
      prisma.paymentHistory.create({
        data: {
          companyId: invoice.companyId,
          amount: invoice.amount,
          currency: invoice.currency,
          reference: `PAY-${invoice.invoiceNumber}`,
          status: "completed",
          invoiceId: id,
        },
      }),
    ]);

    return updated;
  },

  async markAsOverdue(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError("Invoice");
    if (invoice.status === "paid") throw new ConflictError("Cannot mark paid invoice as overdue");

    return prisma.invoice.update({
      where: { id },
      data: { status: "overdue" },
      include: { company: { select: { id: true, name: true, email: true } } },
    });
  },

  async generateMonthlyInvoices() {
    const companies = await prisma.company.findMany({
      where: {
        subscription: {
          status: "active",
          plan: { price: { gt: 0 } },
        },
      },
      include: { subscription: { include: { plan: true } } },
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const results: Array<{ companyId: string; companyName: string; invoiceNumber: string; status: string }> = [];

    for (const company of companies) {
      const existing = await prisma.invoice.findFirst({
        where: {
          companyId: company.id,
          periodStart: { gte: periodStart },
          periodEnd: { lte: periodEnd },
        },
      });
      if (existing) {
        results.push({
          companyId: company.id,
          companyName: company.name,
          invoiceNumber: existing.invoiceNumber,
          status: "skipped (already exists)",
        });
        continue;
      }

      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 7);
      const invoice = await this.createInvoice({
        companyId: company.id,
        amount: company.subscription!.plan.price,
        currency: "ZAR",
        dueDate,
        periodStart,
        periodEnd,
        description: `Monthly subscription - ${company.subscription!.plan.name} plan`,
      });

      await this.sendInvoice(invoice.id);

      results.push({
        companyId: company.id,
        companyName: company.name,
        invoiceNumber: invoice.invoiceNumber,
        status: "sent",
      });
    }

    return results;
  },

  async getRevenueStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [totalRevenue, monthlyRevenue, paidCounts, overdueCounts, companyCount] = await Promise.all([
      prisma.paymentHistory.aggregate({ _sum: { amount: true } }),
      prisma.paymentHistory.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.invoice.count({ where: { status: "paid", paidAt: { gte: yearStart } } }),
      prisma.invoice.count({ where: { status: "overdue" } }),
      prisma.company.count(),
    ]);

    const outstanding = await prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: { in: ["sent", "overdue"] } },
    });

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      paidInvoicesThisYear: paidCounts,
      overdueInvoices: overdueCounts,
      outstandingAmount: outstanding._sum.amount || 0,
      activeCompanies: companyCount,
    };
  },

  async getRevenueTrends() {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const payments = await prisma.paymentHistory.findMany({
      where: { createdAt: { gte: twelveMonthsAgo }, status: "completed" },
      orderBy: { createdAt: "asc" },
    });

    const trends: Array<{ month: string; year: number; revenue: number; count: number }> = [];
    const monthMap = new Map<string, { revenue: number; count: number }>();

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { revenue: 0, count: 0 });
    }

    for (const payment of payments) {
      const d = new Date(payment.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthMap.has(key)) {
        const entry = monthMap.get(key)!;
        entry.revenue += payment.amount;
        entry.count += 1;
      }
    }

    const sortedKeys = Array.from(monthMap.keys()).sort();
    for (const key of sortedKeys) {
      const [yearStr, monthStr] = key.split("-");
      trends.push({
        month: monthStr,
        year: parseInt(yearStr),
        ...monthMap.get(key)!,
      });
    }

    return trends;
  },

  async getCompanies() {
    return prisma.company.findMany({
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { users: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getCompanyById(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        users: { select: { id: true, name: true, email: true, role: true, status: true } },
        invoices: { orderBy: { createdAt: "desc" } },
        _count: { select: { incidents: true, guardingSites: true } },
      },
    });
    if (!company) throw new NotFoundError("Company");
    return company;
  },
};
