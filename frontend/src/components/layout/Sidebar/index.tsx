"use client";

/**
 * Sidebar - The persistent left-side navigation.
 * Renders nav items filtered by user role and highlights the active route.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";

const incidentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", permission: "reports.view" },
  { href: "/incidents", label: "Incidents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", permission: "incidents.view" },
  { href: "/incidents/new", label: "Report Incident", icon: "M12 4v16m8-8H4", hideFromAdmin: true, permission: "incidents.create" },
];

const adminToolsItems = [
  { href: "/admin/permissions", label: "Permissions", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", adminOnly: true },
  { href: "/admin/users", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z", permission: "users.manage" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", permission: "auditLogs.view" },
  { href: "/settings/billing", label: "Billing", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", permission: "billing.manage" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

interface NavItem { href: string; label: string; icon: string; adminOnly?: boolean; hideFromAdmin?: boolean; permission?: string }

/** Renders the list of navigation links, highlighting the active route. */
function NavItemsList({ items, onClose }: { items: NavItem[]; onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {items
        .filter((item) => !item.adminOnly || user?.role === "admin")
        .filter((item) => !item.hideFromAdmin || user?.role !== "admin")
        .filter((item) => !item.permission || user?.permissions?.includes(item.permission))
        .map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" &&
            !pathname.startsWith("/incidents/new") &&
            pathname.startsWith(item.href + "/") &&
            !items.some(
              (other) =>
                other.href !== item.href &&
                (pathname === other.href || pathname.startsWith(other.href + "/")),
            ));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[9px] text-sm font-medium transition-colors duration-150",
              isActive
                ? "text-primary bg-primary/[0.08] shadow-[inset_2px_0_0_var(--color-primary)]"
                : "text-text-secondary hover:text-text hover:bg-surface-elevated",
            )}
          >
            <svg className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "text-text-secondary")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/** A slide-over sidebar with contextual nav items. Shows on desktop always and on mobile when toggled. */
export function Sidebar({ isOpen, onClose, onLogout }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const canReport = user?.permissions?.includes("incidents.create");

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-[264px] flex-col gap-[18px] overflow-y-auto border-r border-border-light bg-surface-raised px-3.5 py-[18px] transition-transform duration-200 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-[10px]">
            <svg className="h-[30px] w-[30px] shrink-0" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M32 8 L52 15.5 V33 c0 12.4-8.6 21.2-20 24-11.4-2.8-20-11.6-20-24V15.5 Z" fill="none" stroke="#86efac" strokeWidth="4" strokeLinejoin="round" />
              <rect x="24" y="25" width="16" height="4" rx="2" fill="#86efac" />
              <rect x="24" y="33" width="16" height="4" rx="2" fill="#86efac" />
              <rect x="24" y="41" width="9" height="4" rx="2" fill="#86efac" />
            </svg>
            <span className="leading-tight">
              <span className="block text-[19px] font-bold tracking-[-0.02em] text-text">SecReports</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle">
                Incident system
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {canReport && (
          <Link
            href="/incidents/new"
            onClick={onClose}
            className={cn(
              "flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-all duration-150",
              pathname === "/incidents/new"
                ? "bg-primary text-gray-900"
                : "bg-gradient-to-r from-primary to-primary-hover text-gray-900 shadow-[0_10px_30px_-12px_rgba(134,239,172,0.55)] hover:brightness-105",
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Report incident
          </Link>
        )}

        <nav className="grid content-start gap-0.5">
          <p className="px-3 pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-subtle">
            Incidents
          </p>
          <NavItemsList items={incidentNavItems.filter((i) => i.href !== "/incidents/new")} onClose={onClose} />
          {(isAdmin ||
            ["auditLogs.view", "billing.manage"].some((p) =>
              user?.permissions?.includes(p),
            )) && (
            <>
              <p className="px-3 pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-subtle">
                Admin tools
              </p>
              <NavItemsList items={adminToolsItems} onClose={onClose} />
            </>
          )}
        </nav>

        <div className="mt-auto grid gap-1.5">
          {user?.role !== "manager" && user?.role !== "senior" && (
            <Link
              href="/settings/billing"
              onClick={onClose}
              className="grid gap-1.5 rounded-xl border border-border-light bg-surface p-3 text-[13px] text-text-secondary transition-colors hover:border-primary/20"
            >
              <span className="w-max rounded-full border border-primary/20 bg-primary/[0.08] px-2.5 py-[3px] text-xs font-semibold text-primary">
                Billing
              </span>
              View your plan and invoices
            </Link>
          )}
          <Link
            href="/profile"
            onClick={onClose}
            className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[9px] text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-elevated hover:text-text"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            View Profile
          </Link>
          <button
            onClick={() => { onClose?.(); onLogout?.(); }}
            className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[9px] text-sm font-medium text-red-300 transition-colors duration-150 hover:bg-red-300/[0.08]"
            aria-label="Logout"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log out
          </button>
          <p className="px-3 pt-1 text-xs text-text-subtle">Version 1.0.0</p>
        </div>
      </aside>
    </>
  );
}
