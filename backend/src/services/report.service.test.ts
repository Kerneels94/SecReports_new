import { ReportService } from "./report.service";
import { prisma } from "../lib/db";

jest.mock("../lib/db", () => ({
  prisma: {
    incident: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    correctiveAction: {
      count: jest.fn(),
    },
  },
}));

describe("ReportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("summary", () => {
    it("executes all 6 parallel queries and returns combined result", async () => {
      (prisma.incident.count as jest.Mock).mockResolvedValueOnce(42);
      (prisma.incident.groupBy as jest.Mock).mockResolvedValueOnce([
        { status: "open", _count: { id: 10 } },
      ]);
      (prisma.incident.groupBy as jest.Mock).mockResolvedValueOnce([
        { severity: "high", _count: { id: 5 } },
      ]);
      (prisma.incident.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, title: "Recent", reporter: { id: 1, name: "Alice" } },
      ]);
      (prisma.incident.count as jest.Mock).mockResolvedValueOnce(3);
      (prisma.correctiveAction.count as jest.Mock).mockResolvedValueOnce(2);

      const result = await ReportService.summary(1, 1);

      expect(result.total).toBe(42);
      expect(result.byStatus).toEqual([{ status: "open", _count: { id: 10 } }]);
      expect(result.bySeverity).toEqual([{ severity: "high", _count: { id: 5 } }]);
      expect(result.recent).toHaveLength(1);
      expect(result.recent[0].title).toBe("Recent");
      expect(result.assignedToMe).toBe(3);
      expect(result.overdueActions).toBe(2);
    });

    it("handles empty data gracefully", async () => {
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);
      (prisma.incident.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.correctiveAction.count as jest.Mock).mockResolvedValue(0);

      const result = await ReportService.summary(1, 1);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual([]);
      expect(result.bySeverity).toEqual([]);
      expect(result.recent).toEqual([]);
      expect(result.assignedToMe).toBe(0);
      expect(result.overdueActions).toBe(0);
    });
  });
});
