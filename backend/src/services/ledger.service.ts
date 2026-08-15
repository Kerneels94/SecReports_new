import { prisma } from "../lib/db";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../lib/errors";

export const LEDGER_ENTRY_TYPES = [
  "invoice",
  "payment",
  "refund",
  "adjustment",
  "credit",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

interface LedgerEntryData {
  companyId: string;
  entryType: string;
  amount: number;
  currency?: string;
  description?: string;
  reference?: string;
  postedAt?: Date;
}

const companySelect = {
  select: { id: true, name: true, email: true },
} as const;

export const LedgerService = {
  /**
   * Post a ledger entry. Amount is signed integer cents: positive for
   * money in (payment, credit, invoice), negative for money out (refund,
   * debit adjustment). Used both by manual superadmin entries and by the
   * invoice flow for automatic posting.
   */
  async postEntry(data: LedgerEntryData) {
    if (!LEDGER_ENTRY_TYPES.includes(data.entryType as LedgerEntryType)) {
      throw new ValidationError("Invalid ledger entry type");
    }
    if (!Number.isFinite(data.amount) || data.amount === 0) {
      throw new ValidationError("Amount must be a non-zero number of cents");
    }

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true },
    });
    if (!company) throw new NotFoundError("Company");

    return prisma.ledger.create({
      data: {
        companyId: data.companyId,
        entryType: data.entryType,
        amount: data.amount,
        currency: data.currency || "ZAR",
        description: data.description,
        reference: data.reference,
        status: "posted",
        postedAt: data.postedAt || new Date(),
      },
      include: { company: companySelect },
    });
  },

  async getEntries(filters?: {
    companyId?: string;
    entryType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.entryType) where.entryType = filters.entryType;
    if (filters?.status) where.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      const postedAt: Record<string, Date> = {};
      if (filters.dateFrom) postedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) postedAt.lte = new Date(filters.dateTo);
      where.postedAt = postedAt;
    }

    return prisma.ledger.findMany({
      where,
      include: { company: companySelect },
      orderBy: { postedAt: "desc" },
    });
  },

  async getEntryById(id: string) {
    const entry = await prisma.ledger.findUnique({
      where: { id },
      include: { company: companySelect },
    });
    if (!entry) throw new NotFoundError("Ledger entry");
    return entry;
  },

  async voidEntry(id: string) {
    const entry = await prisma.ledger.findUnique({ where: { id } });
    if (!entry) throw new NotFoundError("Ledger entry");
    if (entry.status === "void") {
      throw new ConflictError("Ledger entry is already void");
    }

    return prisma.ledger.update({
      where: { id },
      data: { status: "void" },
      include: { company: companySelect },
    });
  },

  async getSummary() {
    const [posted, byType] = await Promise.all([
      prisma.ledger.findMany({
        where: { status: "posted" },
        select: { amount: true, entryType: true },
      }),
      prisma.ledger.groupBy({
        by: ["entryType"],
        where: { status: "posted" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    let totalIn = 0;
    let totalOut = 0;
    for (const entry of posted) {
      if (entry.amount >= 0) totalIn += entry.amount;
      else totalOut += Math.abs(entry.amount);
    }

    return {
      totalIn,
      totalOut,
      netBalance: totalIn - totalOut,
      entryCount: posted.length,
      byType: byType.map((row) => ({
        entryType: row.entryType,
        total: row._sum.amount || 0,
        count: row._count,
      })),
    };
  },
};
