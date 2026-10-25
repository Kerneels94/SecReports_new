/**
 * Business logic for reading audit logs. Provides paginated, filterable
 * listing of audit log entries with performer and company details,
 * scoped to a specific company.
 */
import { prisma } from "../lib/db";
import { Prisma } from "../generated/prisma/client";
import { auditContext } from "../lib/auditContext";

interface ListAuditLogsParams {
  page: number | 0;
  perPage: number | 0;
  companyId: string | null | undefined;
  entityType?: string | null | undefined;
  action?: string | null | undefined;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null | undefined;
}

export const AuditLogService = {
  /** Creates an audit log entry, stamping it with the request context (IP + user agent). */
  async create(params: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    oldValues?: string;
    newValues?: string;
  }) {
    await prisma.auditLog.create({
      data: { ...params, ...auditContext() },
    });
  },

  /**
   * Paginated listing of audit logs with performer info and optional filters.
   * Omitting `companyId` returns entries for every company (superadmin view).
   */
  async list(params: ListAuditLogsParams) {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.companyId) {
      where.performedByUser = { companyId: params.companyId };
    }

    if (params.entityType) where.entityType = params.entityType;
    if (params.action) where.action = params.action;

    if (params.dateFrom || params.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (params.dateFrom) createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) createdAt.lte = new Date(params.dateTo);
      where.createdAt = createdAt;
    }

    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: "insensitive" } },
        {
          performedByUser: {
            name: { contains: params.search, mode: "insensitive" },
          },
        },
        {
          performedByUser: {
            email: { contains: params.search, mode: "insensitive" },
          },
        },
        {
          performedByUser: {
            company: {
              name: { contains: params.search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          performedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total, page: params.page, perPage: params.perPage };
  },

  async exportForCompany(companyId: string) {
    const [company, entries] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, email: true },
      }),
      prisma.auditLog.findMany({
        where: { performedByUser: { companyId } },
        include: {
          performedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { company, entries };
  },

  async exportAll() {
    const entries = await prisma.auditLog.findMany({
      include: {
        performedByUser: {
          select: { id: true, name: true, email: true, company: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { entries };
  },
};
