/**
 * Dashboard layout — wraps all (dashboard) routes with AuthProvider, DashboardModeProvider, Sidebar, and Header.
 * Redirects unauthenticated users to /login.
 * @route /dashboard/*
 */
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DashboardModeProvider, useDashboardMode } from "@/hooks/useDashboardMode";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { SubscriptionStatusGate } from "@/components/subscription/SubscriptionStatusGate";

function DashboardShell({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { mode, setMode } = useDashboardMode();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync mode to pathname on first load (handles direct URL nav / refresh / bookmarks)
  useEffect(() => {
    if (!isLoading) {
      if (pathname.startsWith("/guarding") && mode !== "guarding") {
        setMode("guarding");
      } else if (!pathname.startsWith("/guarding") && mode !== "incidents") {
        setMode("incidents");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    if (mode === "guarding" && !pathname.startsWith("/guarding")) {
      router.push("/guarding");
    } else if (mode === "incidents" && pathname.startsWith("/guarding")) {
      router.push("/dashboard");
    }
  }, [mode, pathname, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.03),transparent_50%)] pointer-events-none" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative flex flex-1 flex-col lg:pl-64">
        <MobileHeader user={user} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} onLogout={logout} />
        <Header user={user} onLogout={logout} />
        <main className="flex-1 animate-fade-in p-4 pt-6 lg:p-8">
          <SubscriptionStatusGate>{children}</SubscriptionStatusGate>
        </main>
      </div>
    </div>
  );
}

/** Dashboard layout component providing providers, sidebar, header, and main content area. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardModeProvider>
        <DashboardShell>{children}</DashboardShell>
      </DashboardModeProvider>
    </AuthProvider>
  );
}
