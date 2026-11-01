import { ReportController } from "./report.controller";
import { ReportService } from "../services/report.service";

jest.mock("../services/report.service", () => ({
  ReportService: {
    summary: jest.fn(),
    monthlyResponse: jest.fn(),
    responseByArea: jest.fn(),
    topSites: jest.fn(),
  },
}));

describe("ReportController", () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      user: { companyId: "5", userId: "10", role: "admin" },
    };
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  describe("summary", () => {
    it("calls ReportService.summary with companyId and userId from request.user", async () => {
      const mockData = {
        total: 10,
        byStatus: [],
        bySeverity: [],
        recent: [],
        assignedToMe: 2,
        overdueActions: 1,
      };
      (ReportService.summary as jest.Mock).mockResolvedValue(mockData);

      await ReportController.summary(mockRequest, mockReply);

      expect(ReportService.summary).toHaveBeenCalledWith("5");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  describe("monthlyResponse", () => {
    it("calls ReportService.monthlyResponse with companyId and sends result", async () => {
      const mockData = [
        { month: "2026-01", avgMs: 1800000 },
        { month: "2026-02", avgMs: 1320000 },
      ];
      (ReportService.monthlyResponse as jest.Mock).mockResolvedValue(mockData);

      await ReportController.monthlyResponse(mockRequest, mockReply);

      expect(ReportService.monthlyResponse).toHaveBeenCalledWith("5");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  describe("responseByArea", () => {
    it("calls ReportService.responseByArea with companyId and sends result", async () => {
      const mockData = [
        { area: "North CBD", avgMs: 1800000, count: 2 },
        { area: "South Gate", avgMs: 600000, count: 1 },
      ];
      (ReportService.responseByArea as jest.Mock).mockResolvedValue(mockData);

      await ReportController.responseByArea(mockRequest, mockReply);

      expect(ReportService.responseByArea).toHaveBeenCalledWith("5");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  describe("topSites", () => {
    it("calls ReportService.topSites with companyId and sends result", async () => {
      const mockData = [
        { site: "1 Main Rd", count: 4 },
        { site: "Mall", count: 2 },
      ];
      (ReportService.topSites as jest.Mock).mockResolvedValue(mockData);

      await ReportController.topSites(mockRequest, mockReply);

      expect(ReportService.topSites).toHaveBeenCalledWith("5");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });
});
