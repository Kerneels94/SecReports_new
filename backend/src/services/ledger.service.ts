import { prisma } from "../lib/db";
import { AuditLogService } from "./auditLog.service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "../lib/errors";

export const LEDGER_ENTRY_TYPES = [
  "invoice",
  "payment",
  "refund",
  "adjustment",
  "credit",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

/**
 * Actor performing the operation. Present for requests from the API
 * (superadmin) and absent for internal/system-driven posts (invoice flow),
 * which are trusted to run without an actor.
 */
export interface LedgerActor {
  userId: string;
  role: string;
}

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

const INT32_MAX = 2147483647;

/** Fail-closed: every controller-facing ledger method requires superadmin. */
function assertSuperadmin(actor?: LedgerActor) {
  if (actor && actor.role !== "superadmin") {
    throw new ForbiddenError("Insufficient permissions");
  }
}

export const LedgerService = {
  /**
   * Post a ledger entry. Amount is signed integer cents: positive for
   * money in (payment, credit, invoice), negative for money out (refund,
   * debit adjustment). Used both by manual superadmin entries and by the
   * invoice flow for automatic posting.
   */
  async postEntry(data: LedgerEntryData, actor?: LedgerActor) {
    assertSuperadmin(actor);
    if (!LEDGER_ENTRY_TYPES.includes(data.entryType as LedgerEntryType)) {
      throw new ValidationError("Invalid ledger entry type");
    }
    if (!Number.isInteger(data.amount) || data.amount === 0) {
      throw new ValidationError(
        "Amount must be a non-zero whole number of cents",
      );
    }
    if (Math.abs(data.amount) > INT32_MAX) {
      throw new ValidationError("Amount out of range");
    }

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true },
    });
    if (!company) throw new NotFoundError("Company");

    const entry = await prisma.ledger.create({
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

    if (actor) {
      await AuditLogService.create({
          entityType: "ledger_entry",
          entityId: entry.id,
          action: "ledger_entry_posted",
          newValues: JSON.stringify({
            companyId: entry.companyId,
            entryType: entry.entryType,
            amount: entry.amount,
            currency: entry.currency,
            reference: entry.reference,
          }),
          performedBy: actor.userId,
        });
    }

    return entry;
  },

  async getEntries(
    filters?: {
      companyId?: string;
      entryType?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    actor?: LedgerActor,
  ) {
    assertSuperadmin(actor);
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

  async getEntryById(id: string, actor?: LedgerActor) {
    assertSuperadmin(actor);
    const entry = await prisma.ledger.findUnique({
      where: { id },
      include: { company: companySelect },
    });
    if (!entry) throw new NotFoundError("Ledger entry");
    return entry;
  },

  async voidEntry(id: string, actor?: LedgerActor) {
    assertSuperadmin(actor);
    const entry = await prisma.ledger.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!entry) throw new NotFoundError("Ledger entry");
    if (entry.status === "void") {
      throw new ConflictError("Ledger entry is already void");
    }

    const result = await prisma.ledger.updateMany({
      where: { id, status: "posted" },
      data: { status: "void" },
    });
    if (result.count === 0) {
      throw new ConflictError("Ledger entry is already void");
    }

    if (actor) {
      await AuditLogService.create({
          entityType: "ledger_entry",
          entityId: id,
          action: "ledger_entry_voided",
          oldValues: JSON.stringify({ status: "posted" }),
          newValues: JSON.stringify({ status: "void" }),
          performedBy: actor.userId,
        });
    }

    return prisma.ledger.findUnique({
      where: { id },
      include: { company: companySelect },
    });
  },

  async getSummary(actor?: LedgerActor) {
    assertSuperadmin(actor);
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
