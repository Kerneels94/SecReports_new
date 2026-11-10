import { AuditLogController } from "./auditLog.controller";
import { AuditLogService } from "../services/auditLog.service";

jest.mock("../lib/db", () => ({
  prisma: { user: { findMany: jest.fn() } },
}));

jest.mock("../services/email.service", () => ({
  ADMIN_FROM_EMAIL: "admin@example.com",
  sendMail: jest.fn(),
}));

jest.mock("../services/auditLog.service", () => ({
  AuditLogService: { exportForCompany: jest.fn() },
}));

const mockExportForCompany = AuditLogService.exportForCompany as jest.Mock;

describe("AuditLogController.exportOwnCompany", () => {
  const reply = {
    header: jest.fn(),
    code: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reply.header.mockReturnValue(reply);
    reply.code.mockReturnValue(reply);
  });

  it("returns the company's audit logs as a PDF attachment", async () => {
    mockExportForCompany.mockResolvedValue({
      company: { name: "Acme Security" },
      entries: [
        {
          createdAt: new Date("2026-05-01T10:00:00Z"),
          performedByUser: { name: "Alice", email: "alice@example.com" },
          action: "login",
          entityType: "user",
          ipAddress: "1.2.3.4",
        },
      ],
    });

    await AuditLogController.exportOwnCompany(
      { user: { companyId: "company-1" } } as any,
      reply as any,
    );

    expect(reply.header).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf",
    );
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining('attachment; filename="audit-logs-acme-security-'),
    );
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(Buffer.isBuffer(reply.send.mock.calls[0][0])).toBe(true);
  });

  it("rejects a user with no company", async () => {
    await expect(
      AuditLogController.exportOwnCompany(
        { user: { companyId: null } } as any,
        reply as any,
      ),
    ).rejects.toThrow("Company is required");
  });
});
