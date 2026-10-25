"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import Link from "next/link";

const adminNavItems = [
  {
    href: "/portal",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/portal/companies",
    label: "Companies",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    href: "/portal/audit-logs",
    label: "Audit Logs",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  },
  {
    href: "/portal/ledger",
    label: "Ledger",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    href: "/portal/invoices",
    label: "Invoices",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    href: "/portal/invoices/new",
    label: "New Invoice",
    icon: "M12 4v16m8-8H4",
  },
];

function AdminShell({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "superadmin")) {
      router.push(user ? "/dashboard" : "/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "superadmin") return null;

  return (
    <div className="flex min-h-screen">
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-surface border-r border-border-light transition-transform duration-200 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary-hover text-gray-900 text-sm font-bold shadow-lg shadow-primary/25">
              S
            </div>
            <div>
              <span className="text-sm font-semibold text-text">
                SecReports
              </span>
              <p className="text-[10px] text-text-secondary/70 tracking-wide uppercase">
                Admin Portal
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
          {adminNavItems.map((item) => {
            const activeHref = adminNavItems
              .filter(
                (i) =>
                  pathname === i.href ||
                  (i.href !== "/portal" && pathname.startsWith(i.href)),
              )
              .sort((a, b) => b.href.length - a.href.length)[0]?.href;
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "cursor-pointer flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative",
                  isActive
                    ? "text-primary bg-linear-to-r from-primary/8 to-transparent"
                    : "text-text-secondary hover:text-text hover:bg-surface-elevated/50",
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-linear-to-b from-primary to-primary-hover" />
                )}
                <svg
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-text-secondary",
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="relative flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-light bg-surface/80 backdrop-blur-md px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors lg:hidden"
            aria-label="Open sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-text">{user.name}</p>
              <p className="text-xs text-text-secondary capitalize">
                {user.role}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-medium text-primary ring-1 ring-primary/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
              aria-label="Logout"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </header>
        <main className="flex-1 animate-fade-in p-4 pt-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
