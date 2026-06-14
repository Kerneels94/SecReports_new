/**
 * Business logic for patrol reports. Handles CRUD with checkpoint tracking
 * for guarding site patrols.
 */
import { prisma } from "../lib/db";
import { NotFoundError } from "../lib/errors";

/** Parameters for creating a patrol report with optional checkpoint entries. */
interface CreatePatrolReportParams {
  siteId: string;
  guardId: string;
  startedAt: string;
  notes?: string;
  checkpoints?: { name: string; scannedAt: string; status?: string }[];
}

/** Parameters for updating a patrol report. */
interface UpdatePatrolReportParams {
  completedAt?: string;
  status?: string;
  notes?: string;
}

export const PatrolReportService = {
  /** Lists patrol reports for a site. */
  async listBySite(siteId: string) {
    return prisma.patrolReport.findMany({
      where: { siteId },
      include: {
        guard: { select: { id: true, name: true, surname: true } },
        _count: { select: { checkpoints: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  },

  /** Lists patrol reports across all company sites with optional date/site filters. */
  async listByCompany(
    companyId: string,
    filters?: { siteId?: string; dateFrom?: string; dateTo?: string },
  ) {
    const where: any = { site: { companyId } };
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.startedAt = {};
      if (filters?.dateFrom) where.startedAt.gte = new Date(filters.dateFrom);
      if (filters?.dateTo) where.startedAt.lte = new Date(filters.dateTo);
    }
    return prisma.patrolReport.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
        guard: { select: { id: true, name: true, surname: true } },
        _count: { select: { checkpoints: true } },
      },
      orderBy: { startedAt: "asc" },
    });
  },

  /** Lists patrol reports for a specific guard. */
  async listByGuard(guardId: string) {
    return prisma.patrolReport.findMany({
      where: { guardId },
      include: {
        site: { select: { id: true, name: true } },
        _count: { select: { checkpoints: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  },

  /** Gets a patrol report with full checkpoint details. */
  async getById(id: string) {
    const report = await prisma.patrolReport.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true, address: true } },
        guard: { select: { id: true, name: true, surname: true } },
        checkpoints: { orderBy: { scannedAt: "asc" } },
      },
    });
    if (!report) throw new NotFoundError("Patrol report");
    return report;
  },

  /** Creates a patrol report with optional checkpoint entries. */
  async create(params: CreatePatrolReportParams) {
    return prisma.patrolReport.create({
      data: {
        siteId: params.siteId,
        guardId: params.guardId,
        startedAt: new Date(params.startedAt),
        notes: params.notes,
        checkpoints: params.checkpoints
          ? {
              create: params.checkpoints.map((cp) => ({
                name: cp.name,
                scannedAt: new Date(cp.scannedAt),
                status: cp.status || "ok",
              })),
            }
          : undefined,
      },
      include: {
        site: { select: { id: true, name: true } },
        guard: { select: { id: true, name: true, surname: true } },
        checkpoints: { orderBy: { scannedAt: "asc" } },
      },
    });
  },

  /** Updates a patrol report's completion time, status, or notes. */
  async update(id: string, params: UpdatePatrolReportParams) {
    const report = await prisma.patrolReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundError("Patrol report");

    const data: any = {};
    if (params.completedAt !== undefined) data.completedAt = new Date(params.completedAt);
    if (params.status !== undefined) data.status = params.status;
    if (params.notes !== undefined) data.notes = params.notes;

    return prisma.patrolReport.update({
      where: { id },
      data,
      include: {
        site: { select: { id: true, name: true } },
        guard: { select: { id: true, name: true, surname: true } },
        checkpoints: { orderBy: { scannedAt: "asc" } },
      },
    });
  },

  /** Deletes a patrol report. */
  async delete(id: string) {
    const report = await prisma.patrolReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundError("Patrol report");

    await prisma.patrolReport.delete({ where: { id } });
  },
};
