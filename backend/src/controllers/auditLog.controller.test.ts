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
    // Sensitive export: the browser must not keep a cached copy.
    expect(reply.header).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("passes the table filters through so the PDF matches what is shown", async () => {
    mockExportForCompany.mockResolvedValue({ company: { name: "Acme" }, entries: [], total: 0 });

    await AuditLogController.exportOwnCompany(
      {
        user: { companyId: "company-1" },
        query: { entityType: "incident", action: "create", dateFrom: "2026-01-01", search: "alice" },
      } as any,
      reply as any,
    );

    expect(mockExportForCompany).toHaveBeenCalledWith("company-1", {
      entityType: "incident",
      action: "create",
      dateFrom: "2026-01-01",
      dateTo: undefined,
      search: "alice",
    });
  });

  it("renders long emails, IPv6 addresses and a partial-export notice without failing", async () => {
    mockExportForCompany.mockResolvedValue({
      company: { name: "Acme" },
      total: 9000,
      entries: [
        {
          createdAt: new Date("2026-05-01T10:00:00Z"),
          performedByUser: {
            name: "A Very Long Operator Name That Wraps",
            email: "a.very.long.mailbox.name.for.testing@subdomain.example-security-company.co.za",
          },
          action: "permissions_updated",
          entityType: "companyPermission",
          ipAddress: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        },
      ],
    });

    await AuditLogController.exportOwnCompany(
      { user: { companyId: "company-1" } } as any,
      reply as any,
    );

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
