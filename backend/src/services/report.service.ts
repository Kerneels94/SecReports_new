import { prisma } from "../lib/db";

export const ReportService = {
  async summary(companyId: string, userId: string) {
    const [
      total,
      allIncidents,
      recent,
      assignedToMe,
      overdueActions,
    ] = await Promise.all([
      prisma.incident.count({ where: { companyId } }),
      prisma.incident.findMany({
        where: { companyId },
        select: { status: true, severity: true },
      }),
      prisma.incident.findMany({
        where: { companyId },
        include: { reporter: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.incident.count({
        where: { companyId, assignedTo: userId },
      }),
      prisma.correctiveAction.count({
        where: {
          status: "overdue",
          incident: { companyId },
        },
      }),
    ]);

    const byStatusMap: Record<string, number> = {};
    const bySeverityMap: Record<string, number> = {};
    for (const inc of allIncidents) {
      byStatusMap[inc.status] = (byStatusMap[inc.status] || 0) + 1;
      bySeverityMap[inc.severity] = (bySeverityMap[inc.severity] || 0) + 1;
    }
    const byStatus = Object.entries(byStatusMap).map(([status, count]) => ({
      status,
      _count: { id: count },
    }));
    const bySeverity = Object.entries(bySeverityMap).map(([severity, count]) => ({
      severity,
      _count: { id: count },
    }));

    return { total, byStatus, bySeverity, recent, assignedToMe, overdueActions };
  },
};
