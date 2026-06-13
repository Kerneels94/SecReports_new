import { prisma } from "../lib/db";
import { NotFoundError } from "../lib/errors";

interface CreatePatrolReportParams {
  siteId: string;
  guardId: string;
  startedAt: string;
  notes?: string;
  checkpoints?: { name: string; scannedAt: string; status?: string }[];
}

interface UpdatePatrolReportParams {
  completedAt?: string;
  status?: string;
  notes?: string;
}

export const PatrolReportService = {
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

  async delete(id: string) {
    const report = await prisma.patrolReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundError("Patrol report");

    await prisma.patrolReport.delete({ where: { id } });
  },
};
