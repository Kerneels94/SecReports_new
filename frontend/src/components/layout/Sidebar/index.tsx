"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useDashboardMode } from "@/hooks/useDashboardMode";

const incidentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/incidents", label: "Incidents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/incidents/new", label: "Report Incident", icon: "M12 4v16m8-8H4" },
  { href: "/reports", label: "Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/admin/users", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
];

const guardingNavItems = [
  { href: "/guarding", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/guarding/sites", label: "Sites", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/guarding/patrols", label: "Patrols", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/guarding/entry-logs", label: "Vehicle Access Logs", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" },
  { href: "/guarding/flagged-vehicles", label: "Flagged Vehicles", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" },
  { href: "/admin/users", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
];

const settingsItem = { href: "/settings/billing", label: "Billing", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" };

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function NavItemsList({ items, onClose }: { items: typeof incidentNavItems; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
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
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative",
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

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { mode, setMode } = useDashboardMode();
  const pathname = usePathname();
  const navItems = mode === "incidents" ? incidentNavItems : guardingNavItems;

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
                {mode === "incidents" ? "Incident System" : "Guarding System"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
          <div className="px-3 py-1.5">
            <p className="text-[10px] text-text-secondary/50 tracking-wider uppercase font-semibold">
              {mode === "incidents" ? "Incidents" : "Guarding"}
            </p>
          </div>
          <NavItemsList items={navItems} onClose={onClose} />
        </nav>
        <div className="p-3 border-t border-border-light">
          <Link
            href={settingsItem.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 mb-2",
              pathname?.startsWith("/settings")
                ? "text-primary bg-gradient-to-r from-primary/[0.08] to-transparent"
                : "text-text-secondary hover:text-text hover:bg-surface-elevated/50",
            )}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={settingsItem.icon} />
            </svg>
            {settingsItem.label}
          </Link>
          <div className="rounded-lg bg-gradient-to-r from-primary/[0.04] to-transparent px-3 py-2.5">
            <p className="text-[10px] text-text-secondary/50 tracking-wider uppercase">Version</p>
            <p className="text-xs text-text-secondary">2.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
