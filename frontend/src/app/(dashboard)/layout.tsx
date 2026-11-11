/**
 * Dashboard layout — wraps all (dashboard) routes with AuthProvider, Sidebar, and Header.
 * Redirects unauthenticated users to /login.
 * @route /dashboard/*
 */
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { SubscriptionStatusGate } from "@/components/subscription/SubscriptionStatusGate";
import { NoAccess } from "@/components/access/NoAccess";

/** Permission a route needs; null = no permission gate (role/admin pages only). */
function requiredPermission(pathname: string): string | null {
  if (pathname.startsWith("/dashboard")) return "reports.view";
  if (pathname.startsWith("/incidents/new")) return "incidents.create";
  if (pathname.startsWith("/incidents")) return "incidents.view";
  if (pathname.startsWith("/admin/audit-logs")) return "auditLogs.view";
  if (pathname.startsWith("/settings/billing")) return "billing.manage";
  return null;
}

function DashboardShell({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.push("/login");
  }, [isLoading, user, router]);

  if (!isLoading && !user) return null;

  return (
    <div className="flex min-h-screen">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.03),transparent_50%)] pointer-events-none" />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />
      <div className="relative flex flex-1 flex-col lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border-light bg-surface-secondary/80 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border text-text transition-colors hover:bg-surface"
            aria-label="Open sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </header>
        <main className="relative z-10 flex-1 animate-fade-in px-4 pb-[72px] pt-8 text-[16px] sm:px-6 lg:px-10">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
                <p className="text-lg text-text-secondary">
                  Loading dashboard...
                </p>
              </div>
            </div>
          ) : (
            (() => {
              const permission = requiredPermission(pathname);
              return permission && !user?.permissions?.includes(permission) ? (
                <NoAccess
                  title="No access"
                  message="Your role doesn't have permission to view this section."
                />
              ) : (
                <SubscriptionStatusGate>{children}</SubscriptionStatusGate>
              );
            })()
          )}
        </main>
      </div>
    </div>
  );
}

/** Dashboard layout component providing providers, sidebar, header, and main content area. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
