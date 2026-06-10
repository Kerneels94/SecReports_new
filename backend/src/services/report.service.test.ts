import { ReportService } from "./report.service";
import { prisma } from "../lib/db";

jest.mock("../lib/db", () => ({
  prisma: {
    incident: {
      count: jest.fn(),
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
    it("executes all 5 parallel queries and returns combined result", async () => {
      (prisma.incident.count as jest.Mock).mockResolvedValueOnce(42);
      (prisma.incident.findMany as jest.Mock).mockResolvedValueOnce([
        { status: "open", severity: "high" },
        { status: "closed", severity: "low" },
      ]);
      (prisma.incident.findMany as jest.Mock).mockResolvedValueOnce([
        { id: "1", title: "Recent", reporter: { id: "1", name: "Alice" } },
      ]);
      (prisma.incident.count as jest.Mock).mockResolvedValueOnce(3);
      (prisma.correctiveAction.count as jest.Mock).mockResolvedValueOnce(2);

      const result = await ReportService.summary("company1", "user1");

      expect(result.total).toBe(42);
      expect(result.byStatus).toEqual([
        { status: "open", _count: { id: 1 } },
        { status: "closed", _count: { id: 1 } },
      ]);
      expect(result.bySeverity).toEqual([
        { severity: "high", _count: { id: 1 } },
        { severity: "low", _count: { id: 1 } },
      ]);
      expect(result.recent).toHaveLength(1);
      expect(result.recent[0].title).toBe("Recent");
      expect(result.assignedToMe).toBe(3);
      expect(result.overdueActions).toBe(2);
    });

    it("handles empty data gracefully", async () => {
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.correctiveAction.count as jest.Mock).mockResolvedValue(0);

      const result = await ReportService.summary("empty", "user");

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual([]);
      expect(result.bySeverity).toEqual([]);
      expect(result.recent).toEqual([]);
      expect(result.assignedToMe).toBe(0);
      expect(result.overdueActions).toBe(0);
    });
  });
});
