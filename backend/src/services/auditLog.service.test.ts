import { AuditLogService, EXPORT_LIMIT } from "./auditLog.service";
import { prisma } from "../lib/db";
import { runWithAuditContext } from "../lib/auditContext";

jest.mock("../lib/db", () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
  },
}));

describe("AuditLogService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it("keeps company scoping when searching by action", async () => {
    await AuditLogService.list({
      page: 1,
      perPage: 20,
      companyId: "company-1",
      search: "login",
    });

    const where = (prisma.auditLog.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.performedByUser).toEqual({ companyId: "company-1" });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { action: { contains: "login", mode: "insensitive" } },
      ]),
    );
  });

  it("lists across every company when no companyId is supplied", async () => {
    await AuditLogService.list({ page: 1, perPage: 20, companyId: null });

    const call = (prisma.auditLog.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.performedByUser).toBeUndefined();
    expect(call.include.performedByUser.select.company).toEqual({
      select: { id: true, name: true },
    });
  });

  it("filters to one company when a companyId is supplied", async () => {
    await AuditLogService.list({ page: 1, perPage: 20, companyId: "company-1" });

    const where = (prisma.auditLog.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.performedByUser).toEqual({ companyId: "company-1" });
  });

  it("exports a company's logs with company details", async () => {
    (prisma.company.findUnique as jest.Mock).mockResolvedValue({
      id: "company-1",
      name: "Acme",
      email: "admin@acme.com",
    });
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([{ id: "log-1" }]);

    const result = await AuditLogService.exportForCompany("company-1");

    expect(result.company).toEqual({
      id: "company-1",
      name: "Acme",
      email: "admin@acme.com",
    });
    expect(result.entries).toEqual([{ id: "log-1" }]);
    expect((prisma.auditLog.findMany as jest.Mock).mock.calls[0][0].where).toEqual({
      performedByUser: { companyId: "company-1" },
    });
    expect((prisma.auditLog.findMany as jest.Mock).mock.calls[0][0].take).toBe(EXPORT_LIMIT);
  });

  it("fuses request context (ip + user agent) into created entries", async () => {
    await runWithAuditContext(
      { ipAddress: "1.2.3.4", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0" },
      () =>
        AuditLogService.create({
          entityType: "user",
          entityId: "u1",
          action: "login",
          performedBy: "u1",
        }),
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: "user",
        entityId: "u1",
        action: "login",
        performedBy: "u1",
        ipAddress: "1.2.3.4",
        userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0",
      },
    });
  });
});