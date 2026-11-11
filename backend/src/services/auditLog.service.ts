/**
 * Business logic for reading audit logs. Provides paginated, filterable
 * listing of audit log entries with performer and company details,
 * scoped to a specific company.
 */
import { prisma } from "../lib/db";
import { Prisma } from "../generated/prisma/client";
import { auditContext } from "../lib/auditContext";

/** Filters shared by the paginated list and the PDF exports. */
export interface AuditLogFilters {
  entityType?: string | null | undefined;
  action?: string | null | undefined;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null | undefined;
}

interface ListAuditLogsParams extends AuditLogFilters {
  page: number | 0;
  perPage: number | 0;
  companyId: string | null | undefined;
}

// ponytail: exports render a PDF in memory, so cap the rows per file. Older
// history stays reachable by exporting with a date range; each export reports
// `total` so a capped file is labelled as partial. Move to a streamed export
// if customers need their full history in one file.
export const EXPORT_LIMIT = 5000;

/**
 * Builds the Prisma filter for audit-log queries. Shared by `list` and the
 * exports so a filtered export contains exactly what the table shows.
 */
function buildWhere(
  companyId: string | null | undefined,
  filters: AuditLogFilters = {},
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (companyId) {
    where.performedByUser = { companyId };
  }

  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.action) where.action = filters.action;

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) createdAt.lte = new Date(filters.dateTo);
    where.createdAt = createdAt;
  }

  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search, mode: "insensitive" } },
      {
        performedByUser: {
          name: { contains: filters.search, mode: "insensitive" },
        },
      },
      {
        performedByUser: {
          email: { contains: filters.search, mode: "insensitive" },
        },
      },
      {
        performedByUser: {
          company: {
            name: { contains: filters.search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  return where;
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
    const where = buildWhere(params.companyId, params);

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

  /**
   * Newest entries (up to EXPORT_LIMIT) for one company, plus `total`
   * matching entries so the caller can flag a capped export as partial.
   */
  async exportForCompany(companyId: string, filters: AuditLogFilters = {}) {
    const where = buildWhere(companyId, filters);
    const [company, entries, total] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, email: true },
      }),
      prisma.auditLog.findMany({
        where,
        include: {
          performedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { company, entries, total };
  },

  /** Newest entries (up to EXPORT_LIMIT) across all companies, plus `total`. */
  async exportAll(filters: AuditLogFilters = {}) {
    const where = buildWhere(null, filters);
    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          performedByUser: {
            select: { id: true, name: true, email: true, company: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { entries, total };
  },
};
