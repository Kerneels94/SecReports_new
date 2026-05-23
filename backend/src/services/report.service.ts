import { prisma } from "../lib/db";

export const ReportService = {
  async summary(companyId: number) {
    const [
      total,
      byStatus,
      bySeverity,
      recent,
    ] = await Promise.all([
      prisma.incident.count({ where: { companyId } }),
      prisma.incident.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { id: true },
      }),
      prisma.incident.groupBy({
        by: ["severity"],
        where: { companyId },
        _count: { id: true },
      }),
      prisma.incident.findMany({
        where: { companyId },
        include: { reporter: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return { total, byStatus, bySeverity, recent };
  },
};
