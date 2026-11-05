import { requirePermission } from "./requirePermission";
import { prisma } from "../lib/db";

jest.mock("../lib/db", () => ({
  prisma: {
    companyPermission: { findUnique: jest.fn() },
  },
}));

const mockFindUnique = prisma.companyPermission.findUnique as jest.Mock;

describe("requirePermission", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it("throws ForbiddenError when no request.user", async () => {
    const middleware = requirePermission("incidents.view");
    await expect(middleware({} as any, {} as any)).rejects.toThrow("Authentication required");
  });

  it("grants using catalog defaults when no override exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const middleware = requirePermission("incidents.view");
    const request = { user: { role: "senior", companyId: "c1" } } as any;
    await expect(middleware(request, {} as any)).resolves.toBeUndefined();
  });

  it("denies a role that is not in the defaults", async () => {
    mockFindUnique.mockResolvedValue(null);
    const middleware = requirePermission("users.manage"); // default: [admin]
    const request = { user: { role: "senior", companyId: "c1" } } as any;
    await expect(middleware(request, {} as any)).rejects.toThrow("Insufficient permissions");
  });

  it("grants admins every permission without reading the database", async () => {
    const middleware = requirePermission("billing.manage");
    const request = { user: { role: "admin", companyId: "c1" } } as any;
    await expect(middleware(request, {} as any)).resolves.toBeUndefined();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("grants admins even when a stored override omits them", async () => {
    mockFindUnique.mockResolvedValue({ roles: ["senior"] });
    const middleware = requirePermission("billing.manage");
    const request = { user: { role: "admin", companyId: "c1" } } as any;
    await expect(middleware(request, {} as any)).resolves.toBeUndefined();
  });

  it("uses the company override instead of catalog defaults", async () => {
    mockFindUnique.mockResolvedValue({ roles: ["senior"] });
    const middleware = requirePermission("users.manage");
    const request = { user: { role: "senior", companyId: "c1" } } as any;
    await expect(middleware(request, {} as any)).resolves.toBeUndefined();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { companyId_permission: { companyId: "c1", permission: "users.manage" } },
    });
  });
});