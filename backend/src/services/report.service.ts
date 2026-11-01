/**
 * Business logic for dashboard reports and aggregations.
 * Handles summary statistics for incidents.
 */
import { prisma } from "../lib/db";
import { SubscriptionService } from "./subscription.service";

/**
 * Duration statistics for a set of dispatch→arrival samples, in milliseconds.
 *
 * Durations stay in ms so a sub-minute response is not rounded away — formatDuration()
 * renders them as "0m 24s" at the edge. The mean is reported alongside the median and the
 * 90th percentile because a single long response drags the mean but barely moves them, so
 * the three together show whether a slow average is typical or one bad job.
 */
function durationStats(times: number[]) {
  // Guards the empty case: reduce over [] and sorted[NaN] both yield nonsense, and the
  // PDF would print "NaNm NaNs" into a client-facing report.
  if (times.length === 0) return { count: 0, avgMs: 0, medianMs: 0, p90Ms: 0 };

  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    avgMs: Math.round(times.reduce((sum, t) => sum + t, 0) / sorted.length),
    medianMs: sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
    // Nearest-rank: the lowest sample at or above 90% of the distribution.
    p90Ms: sorted[Math.ceil(sorted.length * 0.9) - 1],
  };
}

/**
 * Month bucket key for an incident date.
 *
 * UTC, not local: incidentDate is persisted as a Date and incidents are bucketed by calendar
 * month, so a local-time key would file a midnight-UTC incident under the previous month on
 * any host behind UTC and split a single month across two buckets.
 */
const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

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
      const key = monthKey(new Date(inc.incidentDate));
      byMonth[key] = (byMonth[key] || 0) + 1;
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  },

  /** Average response time (dispatch→arrival, ms) per month, for incidents with both times set. */
  async monthlyResponse(companyId: string) {
    const incidents = await prisma.incident.findMany({
      where: { companyId, dispatchTime: { not: null }, arrivalTime: { not: null } },
      select: { incidentDate: true, dispatchTime: true, arrivalTime: true },
    });

    const byMonth: Record<string, number[]> = {};
    for (const inc of incidents) {
      const key = monthKey(new Date(inc.incidentDate));
      const ms = inc.arrivalTime!.getTime() - inc.dispatchTime!.getTime();
      if (ms < 0) continue;
      (byMonth[key] ||= []).push(ms);
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, times]) => ({ month, avgMs: durationStats(times).avgMs }));
  },

  /**
   * Response time (dispatch→arrival) over the last `months` months, broken down per calendar
   * month plus overall stats for the whole period. Each bucket carries the mean, the median and
   * the 90th percentile in milliseconds, so format them at the edge — see durationStats().
   */
  async responseTimeReport(companyId: string, months: number) {
    // Defence in depth: the route allowlists 3/6/9/12, but this is also callable directly and
    // an unchecked months would produce an Invalid Date, which prisma then rejects as a 500.
    const period = ([3, 6, 9, 12] as const).includes(months as 3 | 6 | 9 | 12) ? months : 12;

    // First day of the month `months - 1` months back, so the current month is included.
    // UTC, to match how incidentDate is stored and how monthKey buckets it — a local
    // midnight boundary would drop the first hours of the oldest month on any host ahead of UTC.
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - (period - 1), 1);
    from.setUTCHours(0, 0, 0, 0);

    const incidents = await prisma.incident.findMany({
      where: {
        companyId,
        dispatchTime: { not: null },
        arrivalTime: { not: null },
        incidentDate: { gte: from },
      },
      select: { incidentDate: true, dispatchTime: true, arrivalTime: true },
    });

    const byMonth: Record<string, number[]> = {};
    const all: number[] = [];
    for (const inc of incidents) {
      const ms = inc.arrivalTime!.getTime() - inc.dispatchTime!.getTime();
      if (ms < 0) continue;
      const key = monthKey(new Date(inc.incidentDate));
      (byMonth[key] ||= []).push(ms);
      all.push(ms);
    }

    return {
      months: period,
      from,
      perMonth: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, times]) => ({ month, ...durationStats(times) })),
      overall: all.length > 0 ? durationStats(all) : null,
    };
  },

  /** Average response time (dispatch→arrival, ms) per area, for incidents with both times and a suburb/city/location set. */
  async responseByArea(companyId: string) {
    const incidents = await prisma.incident.findMany({
      where: {
        companyId,
        dispatchTime: { not: null },
        arrivalTime: { not: null },
      },
      select: { suburb: true, city: true, location: true, dispatchTime: true, arrivalTime: true },
    });

    const byArea: Record<string, number[]> = {};
    for (const inc of incidents) {
      const area = [inc.suburb, inc.city].filter(Boolean).join(", ") || inc.location;
      if (!area) continue;
      const ms = inc.arrivalTime!.getTime() - inc.dispatchTime!.getTime();
      if (ms < 0) continue;
      (byArea[area] ||= []).push(ms);
    }

    return Object.entries(byArea)
      .map(([area, times]) => ({ area, avgMs: durationStats(times).avgMs, count: times.length }))
      .sort((a, b) => b.avgMs - a.avgMs);
  },

  /** Incidents per site, busiest first. Site = property address, else business, client, or suburb/city. */
  async topSites(companyId: string, limit = 10) {
    const incidents = await prisma.incident.findMany({
      where: { companyId },
      select: {
        propertyAddress: true,
        businessOrComplex: true,
        clientName: true,
        suburb: true,
        city: true,
      },
    });

    const counts: Record<string, number> = {};
    for (const inc of incidents) {
      const site =
        inc.propertyAddress ||
        inc.businessOrComplex ||
        inc.clientName ||
        [inc.suburb, inc.city].filter(Boolean).join(", ");
      if (!site) continue;
      counts[site] = (counts[site] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};
