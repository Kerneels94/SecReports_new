/**
 * Business logic for the company permission matrix.
 * Returns the catalog merged with per-company overrides, and persists override sets.
 */
import { prisma } from "../lib/db";
import { PERMISSIONS, ROLES } from "../lib/permissions";
import { ValidationError } from "../lib/errors";

export const PermissionService = {
  /** Full matrix for a company: catalog + any role overrides stored in CompanyPermission. */
  async getForCompany(companyId: string) {
    const overrides = await prisma.companyPermission.findMany({
      where: { companyId },
    });
    const map = new Map(overrides.map((o) => [o.permission, o.roles]));

    return {
      roles: [...ROLES],
      permissions: PERMISSIONS.map((p) => ({
        key: p.key,
        label: p.label,
        description: p.description,
        roles: map.get(p.key) ?? p.defaults,
        isDefault: !map.has(p.key),
      })),
    };
  },

  /** Permission keys granted to a role for a company (overrides merged with defaults). */
  async grantsForRole(companyId: string, role: string): Promise<string[]> {
    const overrides = await prisma.companyPermission.findMany({
      where: { companyId },
    });
    const map = new Map(overrides.map((o) => [o.permission, o.roles]));
    const granted: string[] = [];
    for (const p of PERMISSIONS) {
      const roles = map.get(p.key) ?? p.defaults;
      if ((roles as readonly string[]).includes(role)) granted.push(p.key);
    }
    return granted;
  },

  /** Replaces the overrides for a company with the supplied role lists. */
  async updateForCompany(companyId: string, updates: { key: string; roles: string[] }[]) {
    const valid = PERMISSIONS.map((p) => p.key);
    for (const u of updates) {
      if (!valid.includes(u.key)) throw new ValidationError(`Unknown permission: ${u.key}`);
      for (const role of u.roles) {
        if (!(ROLES as readonly string[]).includes(role)) {
          throw new ValidationError(`Unknown role: ${role}`);
        }
      }
    }

    for (const u of updates) {
      await prisma.companyPermission.upsert({
        where: { companyId_permission: { companyId, permission: u.key } },
        create: { companyId, permission: u.key, roles: u.roles },
        update: { roles: u.roles },
      });
    }

    // Drop overrides the admin reset back to catalog defaults.
    const defaults = new Map(PERMISSIONS.map((p) => [p.key, JSON.stringify(p.defaults)]));
    const toRemove = updates.filter(
      (u) => defaults.get(u.key) === JSON.stringify(u.roles.slice().sort()),
    );
    for (const u of toRemove) {
      await prisma.companyPermission.deleteMany({
        where: { companyId, permission: u.key },
      });
    }

    return PermissionService.getForCompany(companyId);
  },
};