/**
 * Business logic for dashboard reports and aggregations.
 * Handles summary statistics for incidents.
 */
import { prisma } from "../lib/db";

export const ReportService = {
  /** Aggregates incident counts by status, recent incidents, and type-based counts (attempted/positive) for the dashboard. */
  async summary(companyId: string, userId: string) {
    const [
      total,
      allIncidents,
      recent,
      attemptedCount,
      positiveCount,
    ] = await Promise.all([
      prisma.incident.count({ where: { companyId } }),
      prisma.incident.findMany({
        where: { companyId },
        select: { status: true },
      }),
      prisma.incident.findMany({
        where: { companyId },
        include: { reporter: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.incident.count({
        where: { companyId, type: { contains: "attempted", mode: "insensitive" } },
      }),
      prisma.incident.count({
        where: { companyId, type: { contains: "positive", mode: "insensitive" } },
      }),
    ]);

    const byStatusMap: Record<string, number> = {};
    for (const inc of allIncidents) {
      byStatusMap[inc.status] = (byStatusMap[inc.status] || 0) + 1;
    }
    const byStatus = Object.entries(byStatusMap).map(([status, count]) => ({
      status,
      _count: { id: count },
    }));

    return { total, byStatus, recent, attemptedCount, positiveCount };
  },
};
