/**
 * Business logic for dashboard reports and aggregations.
 * Handles summary statistics for incidents.
 */
import { prisma } from "../lib/db";
import { SubscriptionService } from "./subscription.service";

export const ReportService = {
  /** Aggregates incident counts by status, recent incidents, and type-based counts (attempted/positive) for the dashboard. */
  async summary(companyId: string) {
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

    const trial = await SubscriptionService.getTrialStatus(companyId);

    return { total, byStatus, recent, attemptedCount, positiveCount, trial };
  },

  async monthlyStats(companyId: string) {
    const incidents = await prisma.incident.findMany({
      where: { companyId },
      select: { incidentDate: true },
    });

    const byMonth: Record<string, number> = {};
    for (const inc of incidents) {
      const d = new Date(inc.incidentDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  },

  /** Average response time (dispatch→arrival, minutes) per month, for incidents with both times set. */
  async monthlyResponse(companyId: string) {
    const incidents = await prisma.incident.findMany({
      where: { companyId, dispatchTime: { not: null }, arrivalTime: { not: null } },
      select: { incidentDate: true, dispatchTime: true, arrivalTime: true },
    });

    const byMonth: Record<string, number[]> = {};
    for (const inc of incidents) {
      const d = new Date(inc.incidentDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mins = (inc.arrivalTime!.getTime() - inc.dispatchTime!.getTime()) / 60000;
      if (mins < 0) continue;
      (byMonth[key] ||= []).push(mins);
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, times]) => ({
        month,
        avgMinutes: Math.round(times.reduce((sum, t) => sum + t, 0) / times.length),
      }));
  },
};
