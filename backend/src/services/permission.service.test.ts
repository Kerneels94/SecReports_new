import { PermissionService } from "./permission.service";
import { prisma } from "../lib/db";
import { PERMISSIONS } from "../lib/permissions";
import { ValidationError } from "../lib/errors";

jest.mock("../lib/db", () => ({
  prisma: {
    companyPermission: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

const mockFindMany = prisma.companyPermission.findMany as jest.Mock;
const mockUpsert = prisma.companyPermission.upsert as jest.Mock;
const mockDeleteMany = prisma.companyPermission.deleteMany as jest.Mock;

describe("PermissionService", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockUpsert.mockReset();
    mockDeleteMany.mockReset();
    mockUpsert.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  describe("getForCompany", () => {
    it("returns catalog defaults when there are no overrides", async () => {
      mockFindMany.mockResolvedValue([]);
      const res = await PermissionService.getForCompany("c1");

      expect(res.roles).toEqual(["admin", "manager", "senior"]);
      expect(res.permissions.length).toBeGreaterThan(0);
      expect(res.permissions.find((p) => p.key === "users.manage")?.roles).toEqual(["admin"]);
      expect(res.permissions.find((p) => p.key === "users.manage")?.isDefault).toBe(true);
    });

    it("merges stored overrides on top of defaults", async () => {
      mockFindMany.mockResolvedValue([{ permission: "users.manage", roles: ["senior"] }]);
      const res = await PermissionService.getForCompany("c1");

      expect(res.permissions.find((p) => p.key === "users.manage")?.roles).toEqual(["admin", "senior"]);
      expect(res.permissions.find((p) => p.key === "users.manage")?.isDefault).toBe(false);
      expect(res.permissions.find((p) => p.key === "incidents.view")?.roles).toEqual([
        "admin", "manager", "senior",
      ]);
    });

    it("always shows admin on every permission even if an override omits it", async () => {
      mockFindMany.mockResolvedValue([{ permission: "incidents.view", roles: [] }]);
      const res = await PermissionService.getForCompany("c1");

      expect(res.permissions.every((p) => p.roles.includes("admin"))).toBe(true);
    });
  });

  describe("grantsForRole", () => {
    it("grants every permission to admin without reading the database", async () => {
      const keys = await PermissionService.grantsForRole("c1", "admin");

      expect(keys.length).toBe(PERMISSIONS.length);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("uses defaults for non-admin roles when there are no overrides", async () => {
      mockFindMany.mockResolvedValue([]);
      const keys = await PermissionService.grantsForRole("c1", "senior");

      expect(keys).toContain("incidents.view");
      expect(keys).not.toContain("users.manage");
    });
  });

  describe("updateForCompany", () => {
    it("rejects unknown permission keys", async () => {
      await expect(
        PermissionService.updateForCompany("c1", [{ key: "nope", roles: ["admin"] }]),
      ).rejects.toThrow(ValidationError);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("rejects unknown roles", async () => {
      await expect(
        PermissionService.updateForCompany("c1", [{ key: "users.manage", roles: ["boss"] }]),
      ).rejects.toThrow(ValidationError);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("upserts overrides that differ from defaults", async () => {
      mockFindMany.mockResolvedValue([
        { permission: "users.manage", roles: ["admin", "manager"] },
        { permission: "auditLogs.view", roles: ["admin", "senior"] },
      ]);

      await PermissionService.updateForCompany("c1", [
        { key: "users.manage", roles: ["admin", "manager"] },
        { key: "auditLogs.view", roles: ["admin", "senior"] },
      ]);

      expect(mockUpsert).toHaveBeenCalledTimes(2);
      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it("drops override rows that match catalog defaults", async () => {
      mockFindMany.mockResolvedValue([{ permission: "users.manage", roles: ["admin"] }]);

      await PermissionService.updateForCompany("c1", [{ key: "users.manage", roles: ["admin"] }]);

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockDeleteMany).toHaveBeenCalledWith({ where: { companyId: "c1", permission: "users.manage" } });
    });

    it("keeps admin on permissions where admin is a default", async () => {
      mockFindMany.mockResolvedValue([]);

      await PermissionService.updateForCompany("c1", [
        { key: "incidents.view", roles: [] },
      ]);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ roles: ["admin"] }),
          update: expect.objectContaining({ roles: ["admin"] }),
        }),
      );
    });
  });
});