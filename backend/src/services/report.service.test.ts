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
  });

  describe("monthlyResponse", () => {
    it("averages dispatch→arrival minutes per month", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-01-15T00:00:00Z", dispatchTime: new Date("2026-01-15T08:00:00Z"), arrivalTime: new Date("2026-01-15T08:25:00Z") },
        { incidentDate: "2026-01-20T00:00:00Z", dispatchTime: new Date("2026-01-20T08:00:00Z"), arrivalTime: new Date("2026-01-20T08:35:00Z") },
        { incidentDate: "2025-12-05T00:00:00Z", dispatchTime: new Date("2025-12-05T08:00:00Z"), arrivalTime: new Date("2025-12-05T08:10:00Z") },
      ]);

      const result = await ReportService.monthlyResponse("company1");

      expect(result).toEqual([
        { month: "2025-12", avgMinutes: 10 },
        { month: "2026-01", avgMinutes: 30 },
      ]);
    });

    it("ignores incidents with missing or negative response times", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([
        { incidentDate: "2026-02-01T00:00:00Z", dispatchTime: new Date("2026-02-01T09:00:00Z"), arrivalTime: new Date("2026-02-01T08:00:00Z") },
        { incidentDate: "2026-03-01T00:00:00Z", dispatchTime: new Date("2026-03-01T09:00:00Z"), arrivalTime: new Date("2026-03-01T09:15:00Z") },
      ]);

      const result = await ReportService.monthlyResponse("company1");

      expect(result).toEqual([{ month: "2026-03", avgMinutes: 15 }]);
      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: "company1", dispatchTime: { not: null }, arrivalTime: { not: null } } }),
      );
    });
  });
});
