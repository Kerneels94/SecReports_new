import { IncidentController } from "./incident.controller";
import { IncidentService } from "../services/incident.service";
import { ValidationError } from "../lib/errors";

jest.mock("../services/subscription.service", () => ({
  SubscriptionService: {
    canCreateIncident: jest.fn(),
  },
}));

jest.mock("../services/incident.service", () => ({
  IncidentService: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../validators/incident.schema", () => ({
  paginationSchema: { safeParse: jest.fn() },
  createIncidentSchema: { safeParse: jest.fn() },
  updateIncidentSchema: { safeParse: jest.fn() },
  updateStatusSchema: { safeParse: jest.fn() },
}));

import { paginationSchema, createIncidentSchema, updateIncidentSchema, updateStatusSchema } from "../validators/incident.schema";

describe("IncidentController", () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      user: { companyId: "1", userId: "1", role: "admin" },
      query: {},
      params: {},
      body: {},
    };
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  describe("list", () => {
    it("calls service with parsed query and responds 200", async () => {
      (paginationSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { page: 1, perPage: 20 },
      });
      (IncidentService.list as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 });

      await IncidentController.list(mockRequest, mockReply);

      expect(IncidentService.list).toHaveBeenCalledWith({
        page: 1, perPage: 20, companyId: "1", userId: "1", role: "admin",
      });
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("throws ValidationError for invalid query", async () => {
      (paginationSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: { perPage: ["Too high"] } }) },
      });

      await expect(IncidentController.list(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("getById", () => {
    it("calls service with string id and responds 200", async () => {
      mockRequest.params = { id: "5" };
      (IncidentService.getById as jest.Mock).mockResolvedValue({ id: "5", title: "Test" });

      await IncidentController.getById(mockRequest, mockReply);

      expect(IncidentService.getById).toHaveBeenCalledWith("5");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: { id: "5", title: "Test" } });
    });
  });

  describe("create", () => {
    const validBody = {
      title: "New",
      description: "Desc",
      type: "equipment_failure",
      incidentDate: "2026-01-01",
      operatorName: "John Operator",
      dispatcher: "Jane Dispatcher",
    };

    it("calls service with body plus companyId and reporterId, responds 201", async () => {
      mockRequest.body = validBody;
      (createIncidentSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: validBody });
      (IncidentService.create as jest.Mock).mockResolvedValue({ id: "1", ...validBody });

      await IncidentController.create(mockRequest, mockReply);

      expect(IncidentService.create).toHaveBeenCalledWith({ ...validBody, companyId: "1", reporterId: "1" });
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });

    it("throws ValidationError for invalid body", async () => {
      (createIncidentSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: { title: ["Required"] } }) },
      });

      await expect(IncidentController.create(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("calls service with parsed body and responds 200", async () => {
      mockRequest.params = { id: "3" };
      mockRequest.body = { title: "Updated" };
      (updateIncidentSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: { title: "Updated" } });
      (IncidentService.update as jest.Mock).mockResolvedValue({ id: "3", title: "Updated" });

      await IncidentController.update(mockRequest, mockReply);

      expect(IncidentService.update).toHaveBeenCalledWith("3", { title: "Updated" }, "1", "admin");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("throws ValidationError for invalid body", async () => {
      mockRequest.params = { id: "3" };
      (updateIncidentSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: {} }) },
      });

      await expect(IncidentController.update(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("updateStatus", () => {
    it("calls service with status and responds 200", async () => {
      mockRequest.params = { id: "3" };
      mockRequest.body = { status: "resolved" };
      (updateStatusSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: { status: "resolved" } });
      (IncidentService.updateStatus as jest.Mock).mockResolvedValue({ id: "3", status: "resolved" });

      await IncidentController.updateStatus(mockRequest, mockReply);

      expect(IncidentService.updateStatus).toHaveBeenCalledWith("3", "resolved", "1");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("throws ValidationError for invalid status", async () => {
      mockRequest.params = { id: "3" };
      (updateStatusSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: {} }) },
      });

      await expect(IncidentController.updateStatus(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("delete", () => {
    it("calls service and responds 204", async () => {
      mockRequest.params = { id: "3" };
      (IncidentService.delete as jest.Mock).mockResolvedValue(undefined);

      await IncidentController.delete(mockRequest, mockReply);

      expect(IncidentService.delete).toHaveBeenCalledWith("3", "1", "admin");
      expect(mockReply.code).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });
  });
});
