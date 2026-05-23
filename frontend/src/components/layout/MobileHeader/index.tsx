"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface MobileHeaderProps {
  user?: { name: string; email: string; role: string } | null;
  onToggleSidebar: () => void;
  onLogout?: () => void;
}

export function MobileHeader({ user, onToggleSidebar, onLogout }: MobileHeaderProps) {
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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-light bg-surface/80 backdrop-blur-md px-4 lg:hidden">
      <button
        onClick={onToggleSidebar}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-gray-900 text-sm font-bold shadow-lg shadow-primary/25">
          S
        </div>
        <div>
          <span className="text-sm font-semibold text-text">SecReports</span>
          <p className="text-[10px] text-text-secondary/60 leading-none">Incident System</p>
        </div>
      </div>

      <div ref={ref} className="relative">
        {user && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-medium text-primary ring-1 ring-primary/20"
          >
            {user.name.charAt(0).toUpperCase()}
          </button>
        )}

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
    </header>
  );
}
