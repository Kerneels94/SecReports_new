"use client";

/**
 * Sidebar - The persistent left-side navigation.
 * Renders nav items filtered by user role and highlights the active route.
 * Filters nav items based on user role.
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

/** Props for the Sidebar component */
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
              "cursor-pointer flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative",
              isActive
                ? "text-primary bg-gradient-to-r from-primary/[0.08] to-transparent"
                : "text-text-secondary hover:text-text hover:bg-surface-elevated/50",
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gradient-to-b from-primary to-primary-hover" />
            )}
            <svg className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-text-secondary")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          "fixed left-0 top-0 z-40 h-full w-64 bg-surface border-r border-border-light transition-transform duration-200 lg:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-gray-900 text-sm font-bold shadow-lg shadow-primary/25">
              S
            </div>
            <div>
              <span className="text-sm font-semibold text-text">SecReports</span>
              <p className="text-[10px] text-text-secondary/70 tracking-wide uppercase">
                Incident System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto text-[18px]">
          <div className="px-3 py-1.5">
            <p className="text-[10px] text-text-secondary/50 tracking-wider uppercase font-semibold">
              Incidents
            </p>
          </div>
          <NavItemsList items={incidentNavItems} onClose={onClose} />
          {(isAdmin ||
            ["auditLogs.view", "billing.manage"].some((p) =>
              user?.permissions?.includes(p),
            )) && (
            <>
              <div className="px-3 py-1.5 mt-3">
                <p className="text-[10px] text-text-secondary/50 tracking-wider uppercase font-semibold">
                  Admin Tools
                </p>
              </div>
              <NavItemsList items={adminToolsItems} onClose={onClose} />
            </>
          )}
        </nav>
        <div className="flex flex-col gap-2 p-3 border-t border-border-light">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-elevated/50 transition-all duration-150"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            View Profile
          </Link>
          <button
            onClick={() => { onClose?.(); onLogout?.(); }}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger/80 hover:text-danger hover:bg-red-500/10 transition-all duration-150"
            aria-label="Logout"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
          <div className="rounded-lg bg-gradient-to-r from-primary/[0.04] to-transparent px-3 py-2.5">
            <p className="text-[10px] text-text-secondary/50 tracking-wider uppercase">Version</p>
            <p className="text-xs text-text-secondary">1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
