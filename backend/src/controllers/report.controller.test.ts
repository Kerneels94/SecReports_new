import { ReportController } from "./report.controller";
import { ReportService } from "../services/report.service";

jest.mock("../services/report.service", () => ({
  ReportService: {
    summary: jest.fn(),
  },
}));

describe("ReportController", () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      user: { companyId: 5, userId: 10, role: "admin" },
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

      expect(ReportService.summary).toHaveBeenCalledWith(5, 10);
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });
});
