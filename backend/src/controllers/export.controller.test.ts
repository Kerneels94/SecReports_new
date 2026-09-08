import { ExportController } from "./export.controller";
import { prisma } from "../lib/db";
import { SubscriptionService } from "../services/subscription.service";

jest.mock("../lib/db", () => ({
  prisma: {
    incident: { findMany: jest.fn() },
    company: { findUnique: jest.fn() },
  },
}));

jest.mock("../services/subscription.service", () => ({
  SubscriptionService: { requireFeature: jest.fn() },
}));

describe("ExportController.yearlyPdf", () => {
  const reply = {
    header: jest.fn(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const request = {
    user: { companyId: "company1", userId: "user1" },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.company.findUnique as jest.Mock).mockResolvedValue({ name: "Acme Security" });
  });

  it("generates a PDF of yearly crime statistics", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
        dispatchTime: new Date("2026-05-01T10:00:00Z"),
        arrivalTime: new Date("2026-05-01T10:12:00Z"),
      },
      {
        incidentDate: new Date("2026-03-01"),
        type: "positive",
        propertyAddress: "123 Main St",
        dispatchTime: new Date("2026-03-01T09:00:00Z"),
        arrivalTime: new Date("2026-03-01T09:00:30Z"),
      },
      {
        incidentDate: new Date("2025-12-20"),
        type: "attempted",
        propertyAddress: "456 Oak Ave",
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    expect(prisma.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company1" } }),
    );
    expect(SubscriptionService.requireFeature).toHaveBeenCalledWith("company1", "export_csv_pdf");
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringMatching(/^attachment; filename=yearly-crime-stats-acme-security-\d{4}-\d{2}-\d{2}\.pdf$/),
    );
    expect(reply.send.mock.calls[0][0]).toBeInstanceOf(Buffer);
    expect(reply.send.mock.calls[0][0].length).toBeGreaterThan(1000);
  });

  it("returns 404 when no incidents exist", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);

    await ExportController.yearlyPdf(request, reply as any);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});