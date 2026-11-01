import { ReportService } from "./report.service";
import { prisma } from "../lib/db";

jest.mock("../lib/db", () => ({
  prisma: {
    incident: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    companySubscription: {
      findUnique: jest.fn(),
    },
  },
}));

describe("ReportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("summary", () => {
    it("executes all parallel queries and returns combined result", async () => {
      (prisma.incident.count as jest.Mock).mockResolvedValueOnce(42);
      (prisma.incident.findMany as jest.Mock).mockResolvedValueOnce([
        { status: "open" },
        { status: "closed" },
      ]);
      (prisma.incident.findMany as jest.Mock).mockResolvedValueOnce([
        { id: "1", title: "Recent", reporter: { id: "1", name: "Alice" } },
      ]);
      (prisma.incident.count as jest.Mock).mockResolvedValueOnce(3);
      (prisma.incident.count as jest.Mock).mockResolvedValueOnce(2);

      const result = await ReportService.summary("company1");

      expect(result.total).toBe(42);
      expect(result.byStatus).toEqual([
        { status: "open", _count: { id: 1 } },
        { status: "closed", _count: { id: 1 } },
      ]);
      expect(result.recent).toHaveLength(1);
      expect(result.recent[0].title).toBe("Recent");
      expect(result.attemptedCount).toBe(3);
      expect(result.positiveCount).toBe(2);
    });

    it("handles empty data gracefully", async () => {
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ReportService.summary("empty");

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual([]);
      expect(result.recent).toEqual([]);
      expect(result.attemptedCount).toBe(0);
      expect(result.positiveCount).toBe(0);
    });
  });

  describe("monthlyStats", () => {
    it("groups incidents by month in ascending order", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-15T00:00:00Z" },
        { incidentDate: "2026-01-20T00:00:00Z" },
        { incidentDate: "2025-12-05T00:00:00Z" },
        { incidentDate: "2026-03-10T00:00:00Z" },
      ]);

      const result = await ReportService.monthlyStats("company1");

      expect(result).toEqual([
        { month: "2025-12", count: 1 },
        { month: "2026-01", count: 2 },
        { month: "2026-03", count: 1 },
      ]);
      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: "company1" } }),
      );
    });

    it("returns empty array when no incidents exist", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      const result = await ReportService.monthlyStats("empty");
      expect(result).toEqual([]);
    });

    describe("on a host ahead of UTC", () => {
      const originalTz = process.env.TZ;
      beforeAll(() => {
        process.env.TZ = "Africa/Johannesburg";
      });
      afterAll(() => {
        process.env.TZ = originalTz;
      });

      // 23:00 UTC on 30 April is 01:00 SAST on 1 May.
      const lateApril = {
        incidentDate: "2026-04-30T23:00:00Z",
        dispatchTime: new Date("2026-04-30T23:00:00Z"),
        arrivalTime: new Date("2026-04-30T23:10:00Z"),
      };

      it("buckets by UTC month, not the host's local month", async () => {
        (prisma.incident.findMany as jest.Mock).mockResolvedValue([lateApril]);

        expect(await ReportService.monthlyStats("company1")).toEqual([
          { month: "2026-04", count: 1 },
        ]);
      });

      it("uses the same month keys as monthlyResponse", async () => {
        (prisma.incident.findMany as jest.Mock).mockResolvedValue([lateApril]);

        const stats = await ReportService.monthlyStats("company1");
        const response = await ReportService.monthlyResponse("company1");

        expect(stats.map((s) => s.month)).toEqual(response.map((r) => r.month));
      });
    });
  });

  describe("monthlyResponse", () => {
    it("averages dispatch→arrival milliseconds per month", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-15T00:00:00Z", dispatchTime: new Date("2026-01-15T08:00:00Z"), arrivalTime: new Date("2026-01-15T08:25:00Z") },
        { incidentDate: "2026-01-20T00:00:00Z", dispatchTime: new Date("2026-01-20T08:00:00Z"), arrivalTime: new Date("2026-01-20T08:35:00Z") },
        { incidentDate: "2025-12-05T00:00:00Z", dispatchTime: new Date("2025-12-05T08:00:00Z"), arrivalTime: new Date("2025-12-05T08:10:00Z") },
      ]);

      const result = await ReportService.monthlyResponse("company1");

      expect(result).toEqual([
        { month: "2025-12", avgMs: 600000 },
        { month: "2026-01", avgMs: 1800000 },
      ]);
    });

    it("keeps a sub-minute month rather than rounding it to zero", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-15T00:00:00Z", dispatchTime: new Date("2026-01-15T08:00:00Z"), arrivalTime: new Date("2026-01-15T08:00:24Z") },
      ]);

      expect(await ReportService.monthlyResponse("company1")).toEqual([
        { month: "2026-01", avgMs: 24000 },
      ]);
    });

    it("ignores incidents with missing or negative response times", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-02-01T00:00:00Z", dispatchTime: new Date("2026-02-01T09:00:00Z"), arrivalTime: new Date("2026-02-01T08:00:00Z") },
        { incidentDate: "2026-03-01T00:00:00Z", dispatchTime: new Date("2026-03-01T09:00:00Z"), arrivalTime: new Date("2026-03-01T09:15:00Z") },
      ]);

      const result = await ReportService.monthlyResponse("company1");

      expect(result).toEqual([{ month: "2026-03", avgMs: 900000 }]);
      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: "company1", dispatchTime: { not: null }, arrivalTime: { not: null } } }),
      );
    });
  });

  describe("responseTimeReport", () => {
    const min = (m: number) => m * 60000;

    it("reports mean, median and 90th percentile per month and overall", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-15T00:00:00Z", dispatchTime: new Date("2026-01-15T08:00:00Z"), arrivalTime: new Date("2026-01-15T08:25:00Z") },
        { incidentDate: "2026-01-20T00:00:00Z", dispatchTime: new Date("2026-01-20T08:00:00Z"), arrivalTime: new Date("2026-01-20T08:35:00Z") },
        { incidentDate: "2026-02-10T00:00:00Z", dispatchTime: new Date("2026-02-10T08:00:00Z"), arrivalTime: new Date("2026-02-10T08:10:00Z") },
      ]);

      const result = await ReportService.responseTimeReport("company1", 3);

      expect(result.months).toBe(3);
      expect(result.perMonth).toEqual([
        { month: "2026-01", count: 2, avgMs: min(30), medianMs: min(30), p90Ms: min(35) },
        { month: "2026-02", count: 1, avgMs: min(10), medianMs: min(10), p90Ms: min(10) },
      ]);
      // 25, 35, 10 minutes: mean 23m20s, median 25m, p90 (nearest-rank of 3) 35m
      expect(result.overall).toEqual({
        count: 3,
        avgMs: 1400000,
        medianMs: min(25),
        p90Ms: min(35),
      });
    });

    it("averages the two middle samples for an even-sized median", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-01T00:00:00Z", dispatchTime: new Date("2026-01-01T00:00:00Z"), arrivalTime: new Date("2026-01-01T00:10:00Z") },
        { incidentDate: "2026-01-02T00:00:00Z", dispatchTime: new Date("2026-01-02T00:00:00Z"), arrivalTime: new Date("2026-01-02T00:20:00Z") },
        { incidentDate: "2026-01-03T00:00:00Z", dispatchTime: new Date("2026-01-03T00:00:00Z"), arrivalTime: new Date("2026-01-03T00:30:00Z") },
        { incidentDate: "2026-01-04T00:00:00Z", dispatchTime: new Date("2026-01-04T00:00:00Z"), arrivalTime: new Date("2026-01-04T00:40:00Z") },
      ]);

      const result = await ReportService.responseTimeReport("company1", 3);

      // 10, 20, 30, 40 → mean 25m, median (20+30)/2 = 25m, p90 (ceil(3.6)=4th) 40m
      expect(result.overall).toEqual({ count: 4, avgMs: min(25), medianMs: min(25), p90Ms: min(40) });
    });

    it("keeps a slow outlier out of the median", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue(
        [10, 12, 11, 13, 300].map((m, i) => {
          const dispatch = new Date(Date.UTC(2026, 0, i + 1));
          return {
            incidentDate: dispatch.toISOString(),
            dispatchTime: dispatch,
            arrivalTime: new Date(dispatch.getTime() + m * 60000),
          };
        }),
      );

      const result = await ReportService.responseTimeReport("company1", 3);

      // 10, 11, 12, 13, 300 → mean is dragged to 69.2m, median stays at the typical 12m
      expect(result.overall).toEqual({
        count: 5,
        avgMs: Math.round(min(69.2)),
        medianMs: min(12),
        p90Ms: min(300),
      });
    });

    it("keeps sub-minute response times instead of rounding them to zero", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-15T00:00:00Z", dispatchTime: new Date("2026-01-15T08:00:00Z"), arrivalTime: new Date("2026-01-15T08:00:24Z") },
      ]);

      const result = await ReportService.responseTimeReport("company1", 3);

      // 24s, which whole-minute rounding would have reported as 0
      expect(result.overall).toEqual({ count: 1, avgMs: 24000, medianMs: 24000, p90Ms: 24000 });
    });

    it("falls back to 12 months when the period is not an allowlisted value", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);

      // Defence in depth: the route enum already rejects this, but the service is callable
      // directly and an out-of-range months would build an Invalid Date for prisma.
      const result = await ReportService.responseTimeReport("company1", 7);

      expect(result.months).toBe(12);
    });

    it("scopes to the company and filters to incidents with both times and a date range", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ReportService.responseTimeReport("company1", 12);

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.companyId).toBe("company1");
      expect(where.dispatchTime).toEqual({ not: null });
      expect(where.arrivalTime).toEqual({ not: null });
      // First day of the month 11 months back, in UTC to match how incidentDate is stored and
      // bucketed. Asserted with getUTC* so the test is honest on a non-UTC host too.
      expect(where.incidentDate.gte.getUTCDate()).toBe(1);
      expect(where.incidentDate.gte.getUTCHours()).toBe(0);
      expect(where.incidentDate.gte.getUTCMinutes()).toBe(0);
      expect(result.perMonth).toEqual([]);
      expect(result.overall).toBeNull();
    });

    it("ignores incidents with negative response times", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-01T00:00:00Z", dispatchTime: new Date("2026-01-01T09:00:00Z"), arrivalTime: new Date("2026-01-01T08:00:00Z") },
        { incidentDate: "2026-01-02T00:00:00Z", dispatchTime: new Date("2026-01-02T09:00:00Z"), arrivalTime: new Date("2026-01-02T09:15:00Z") },
      ]);

      const result = await ReportService.responseTimeReport("company1", 3);

      expect(result.perMonth).toEqual([
        { month: "2026-01", count: 1, avgMs: 900000, medianMs: 900000, p90Ms: 900000 },
      ]);
      expect(result.overall).toEqual({ count: 1, avgMs: 900000, medianMs: 900000, p90Ms: 900000 });
    });
  });

  describe("responseByArea", () => {
    it("averages dispatch→arrival milliseconds per area, sorted by slowest, with counts", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { suburb: "North CBD", city: "Joburg", location: "North CBD", dispatchTime: new Date("2026-01-15T08:00:00Z"), arrivalTime: new Date("2026-01-15T08:25:00Z") },
        { suburb: "North CBD", city: "Joburg", location: "North CBD", dispatchTime: new Date("2026-01-20T08:00:00Z"), arrivalTime: new Date("2026-01-20T08:35:00Z") },
        { suburb: "South Gate", city: "Joburg", location: "South Gate", dispatchTime: new Date("2026-01-21T08:00:00Z"), arrivalTime: new Date("2026-01-21T08:10:00Z") },
        { suburb: null, city: "Cape Town", location: "Old Suburb", dispatchTime: new Date("2026-01-22T08:00:00Z"), arrivalTime: new Date("2026-01-22T08:20:00Z") },
        { suburb: null, city: null, location: "Old Suburb", dispatchTime: new Date("2026-01-23T08:00:00Z"), arrivalTime: new Date("2026-01-23T08:15:00Z") },
      ]);

      const result = await ReportService.responseByArea("company1");

      expect(result).toEqual([
        { area: "North CBD, Joburg", avgMs: 1800000, count: 2 },
        { area: "Cape Town", avgMs: 1200000, count: 1 },
        { area: "Old Suburb", avgMs: 900000, count: 1 },
        { area: "South Gate, Joburg", avgMs: 600000, count: 1 },
      ]);
      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: "company1",
            dispatchTime: { not: null },
            arrivalTime: { not: null },
          },
        }),
      );
    });

    it("skips incidents without any area", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { suburb: null, city: null, location: null, dispatchTime: new Date("2026-01-15T08:00:00Z"), arrivalTime: new Date("2026-01-15T08:25:00Z") },
      ]);
      const result = await ReportService.responseByArea("empty");
      expect(result).toEqual([]);
    });

    it("returns empty array when no incidents match", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      const result = await ReportService.responseByArea("empty");
      expect(result).toEqual([]);
    });
  });

  describe("topSites", () => {
    it("counts incidents per site using the property/business/client/suburb fallback chain, busiest first", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { propertyAddress: "1 Main Rd", businessOrComplex: "Mall", clientName: "Acme", suburb: "North", city: "Joburg" },
        { propertyAddress: "1 Main Rd", businessOrComplex: "Mall", clientName: "Acme", suburb: "North", city: "Joburg" },
        { propertyAddress: null, businessOrComplex: "Mall", clientName: "Acme", suburb: "North", city: "Joburg" },
        { propertyAddress: null, businessOrComplex: null, clientName: "Acme", suburb: "North", city: "Joburg" },
        { propertyAddress: null, businessOrComplex: null, clientName: null, suburb: "South", city: "Joburg" },
        { propertyAddress: null, businessOrComplex: null, clientName: null, suburb: null, city: null },
      ]);

      const result = await ReportService.topSites("company1");

      expect(result).toEqual([
        { site: "1 Main Rd", count: 2 },
        { site: "Mall", count: 1 },
        { site: "Acme", count: 1 },
        { site: "South, Joburg", count: 1 },
      ]);
    });

    it("caps the ranking at the limit", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          propertyAddress: `Site ${i + 1}`,
          businessOrComplex: null,
          clientName: null,
          suburb: null,
          city: null,
        })),
      );

      expect(await ReportService.topSites("company1", 3)).toHaveLength(3);
    });

    it("returns an empty array when there are no incidents", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      expect(await ReportService.topSites("empty")).toEqual([]);
    });
  });
});
