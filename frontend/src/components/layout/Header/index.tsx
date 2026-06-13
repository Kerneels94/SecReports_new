"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useDashboardMode } from "@/hooks/useDashboardMode";

interface HeaderProps {
  user?: { name: string; email: string; role: string } | null;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const { mode, setMode } = useDashboardMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-border-light bg-surface/80 backdrop-blur-md px-8 lg:flex">
      <div className="flex items-center gap-1 rounded-lg bg-surface-elevated/50 p-0.5 ring-1 ring-border-light">
        <button
          onClick={() => setMode("incidents")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
            mode === "incidents"
              ? "bg-surface text-text shadow-sm"
              : "text-text-secondary hover:text-text",
          )}
        >
          Incident Reports
        </button>
        <button
          onClick={() => setMode("guarding")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
            mode === "guarding"
              ? "bg-surface text-text shadow-sm"
              : "text-text-secondary hover:text-text",
          )}
        >
          Guarding
        </button>
      </div>

      {user && (
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-elevated/50 transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-text">{user.name}</p>
              <p className="text-xs text-text-secondary capitalize">{user.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-medium text-primary ring-1 ring-primary/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-surface shadow-2xl shadow-black/40 ring-1 ring-border-light animate-slide-up overflow-hidden">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-text hover:bg-surface-elevated/20 transition-colors"
              >
                <svg className="h-4 w-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                View Profile
              </Link>
              {onLogout && (
                <button
                  onClick={() => { setOpen(false); onLogout(); }}
                  className="flex items-center gap-2.5 w-full text-left px-4 py-3 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-elevated/20 transition-colors border-t border-border-light/30"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
