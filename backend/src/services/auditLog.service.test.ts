import { AuditLogService } from "./auditLog.service";
import { prisma } from "../lib/db";

jest.mock("../lib/db", () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("AuditLogService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
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
});