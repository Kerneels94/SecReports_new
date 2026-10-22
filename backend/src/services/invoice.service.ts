import { prisma } from "../lib/db";
import { NotFoundError, ConflictError, AppError } from "../lib/errors";
import { ADMIN_FROM_EMAIL, sendMail } from "./email.service";
import { getNextBillingDate } from "./subscription.service";
import { generateInvoicePdf } from "../templates/invoice-pdf";

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
    const invoice = await prisma.invoice.create({
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

    return invoice;
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
      // dateTo is date-only ("2026-10-22" = midnight UTC); lte on that drops the whole
      // selected day, so the upper bound is the start of the next day.
      if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) createdAt.lt = new Date(Date.parse(filters.dateTo) + 86_400_000);
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

    const pdf = await generateInvoicePdf({
      companyName: invoice.company.name,
      amount: invoice.amount,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate,
      invoiceDate: invoice.createdAt,
      description: invoice.description ?? undefined,
    });

    await sendMail({
      to: invoice.company.email,
      from: ADMIN_FROM_EMAIL,
      subject: "invoice",
      data: {
        companyName: invoice.company.name,
        amount: invoice.amount,
        currency: invoice.currency,
        invoiceNumber: invoice.invoiceNumber,
        dueDate: invoice.dueDate.toISOString(),
        description: invoice.description ?? undefined,
      },
      attachments: [
        { filename: `${invoice.invoiceNumber}.pdf`, content: pdf },
      ],
    }).then(({ error }) => {
      if (error)
        throw new AppError(
          502,
          "EMAIL_SEND_FAILED",
          "Invoice email could not be sent",
        );
    });

    await prisma.invoice.update({
      where: { id },
      data: { status: "sent" },
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

    try {
      return await prisma.$transaction(async (tx) => {
        // Conditional update: a concurrent request (double-click) must not record the payment twice.
        const { count } = await tx.invoice.updateMany({
          where: { id, status: { not: "paid" } },
          data: {
            status: "paid",
            paidAt: new Date(),
          },
        });
        if (count === 0) throw new ConflictError("Invoice already paid");

        await tx.paymentHistory.create({
          data: {
            companyId: invoice.companyId,
            amount: invoice.amount,
            currency: invoice.currency,
            reference: `PAY-${invoice.invoiceNumber}`,
            status: "completed",
            invoiceId: id,
          },
        });
        await tx.ledger.create({
          data: {
            companyId: invoice.companyId,
            entryType: "payment",
            amount: invoice.amount,
            currency: invoice.currency,
            reference: `PAY-${invoice.invoiceNumber}`,
            description: `Payment received for ${invoice.invoiceNumber}`,
            status: "paid",
            postedAt: new Date(),
          },
        });

        return tx.invoice.findUniqueOrThrow({ where: { id } });
      });
    } catch (err) {
      // P2034: MongoDB write conflict with a concurrent transaction paying the same invoice.
      if ((err as { code?: string }).code === "P2034") throw new ConflictError("Invoice already paid");
      throw err;
    }
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

      const dueDate = getNextBillingDate(now);
      const invoice = await this.createInvoice({
        companyId: company.id,
        amount: company.subscription!.plan.price,
        currency: "ZAR",
        dueDate,
        periodStart,
        periodEnd,
        description: `Monthly subscription - ${company.subscription!.plan.name} plan`,
      });

      try {
        await this.sendInvoice(invoice.id);
        results.push({
          companyId: company.id,
          companyName: company.name,
          invoiceNumber: invoice.invoiceNumber,
          status: "sent",
        });
      } catch (err) {
        results.push({
          companyId: company.id,
          companyName: company.name,
          invoiceNumber: invoice.invoiceNumber,
          status: `failed (${err instanceof Error ? err.message : "unknown error"})`,
        });
      }
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
        _count: { select: { incidents: true } },
      },
    });
    if (!company) throw new NotFoundError("Company");
    return company;
  },
};
