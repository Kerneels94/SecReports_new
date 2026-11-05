/**
 * Permission catalog for company-level (non-superadmin) access control.
 * Each permission maps to a set of role names that grant it by default.
 * Companies can override defaults per permission (stored in CompanyPermission).
 * Defaults mirror the previous hardcoded requireRole(...) calls exactly.
 */
export const ROLES = ["admin", "manager", "senior"] as const;
export type Role = (typeof ROLES)[number];

export interface Permission {
  key: string;
  label: string;
  description: string;
  defaults: Role[];
}

export const PERMISSIONS: Permission[] = [
  {
    key: "incidents.view",
    label: "View incidents",
    description: "See the incident list and incident details",
    defaults: ["admin", "manager", "senior"],
  },
  {
    key: "incidents.create",
    label: "Report incidents",
    description: "Create new incident reports",
    defaults: ["admin", "manager", "senior"],
  },
  {
    key: "reports.view",
    label: "View reports & analytics",
    description: "Dashboard summaries and monthly stats",
    defaults: ["admin", "manager", "senior"],
  },
  {
    key: "users.manage",
    label: "Manage users",
    description: "Create, list, and remove employee accounts",
    defaults: ["admin"],
  },
  {
    key: "users.update",
    label: "Update users",
    description: "Edit employee names, emails, and roles",
    defaults: ["admin", "manager"],
  },
  {
    key: "auditLogs.view",
    label: "View audit logs",
    description: "See activity and change tracking logs",
    defaults: ["admin", "manager"],
  },
  {
    key: "export.csv",
    label: "CSV / PDF exports",
    description: "Download incident exports",
    defaults: ["admin", "manager"],
  },
  {
    key: "export.reports",
    label: "Yearly & emailed reports",
    description: "Yearly PDF and emailed report distribution",
    defaults: ["admin", "manager", "senior"],
  },
  {
    key: "billing.manage",
    label: "Manage billing",
    description: "Change subscription plan",
    defaults: ["admin"],
  },
];

/** Roles granted for a permission key, or [] if the key is unknown. */
export function defaultRoles(key: string): string[] {
  return PERMISSIONS.find((p) => p.key === key)?.defaults ?? [];
}

/** Every permission key. Admins are hardcoded to always hold these. */
export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);