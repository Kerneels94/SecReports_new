/**
 * Business logic for reading audit logs. Provides paginated, filterable
 * listing of audit log entries with performer and company details,
 * scoped to a specific company.
 */
import { prisma } from "../lib/db";
import { auditContext } from "../lib/auditContext";

interface ListAuditLogsParams {
  page: number;
  perPage: number;
  companyId: string;
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
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

  /** Paginated listing of audit logs for a company with performer info and optional filters. */
  async list(params: ListAuditLogsParams) {
    const where: any = {
      performedByUser: { companyId: params.companyId },
    };

    if (params.entityType) where.entityType = params.entityType;
    if (params.action) where.action = params.action;

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
    }

    if (params.search) {
      where.performedByUser = { companyId: params.companyId };
      where.OR = [
        { action: { contains: params.search, mode: "insensitive" } },
        { performedByUser: { name: { contains: params.search, mode: "insensitive" } } },
        { performedByUser: { email: { contains: params.search, mode: "insensitive" } } },
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
};
