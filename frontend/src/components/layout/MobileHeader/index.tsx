"use client";

/**
 * AppHeader - sticky top bar for the signed-in app.
 * Shows the sidebar toggle on mobile and the account menu on desktop.
 */

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface MobileHeaderProps {
  onToggleSidebar: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Top bar with sidebar toggle and account dropdown. */
export function MobileHeader({ onToggleSidebar }: MobileHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-light bg-surface-secondary/80 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <button
        onClick={onToggleSidebar}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border text-text transition-colors hover:bg-surface lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <details className="dropdown ml-auto">
        <summary
          className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface [&::-webkit-details-marker]:hidden"
          aria-label="Account menu"
        >
          <span className="hidden text-right leading-tight sm:grid">
            <b className="text-sm font-semibold text-text">{user?.name}</b>
            <small className="text-xs capitalize text-text-secondary/60">{user?.role}</small>
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/20 bg-primary/10 text-[13px] font-semibold text-primary">
            {user ? initials(user.name) : "?"}
          </span>
          <svg className="h-4 w-4 text-text-secondary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="absolute right-4 top-[calc(100%+4px)] w-60 rounded-xl border border-border bg-surface p-1.5 shadow-2xl shadow-black/40 sm:right-6 lg:right-10">
          <p className="mb-1 border-b border-border px-3 py-2 text-[13px] text-text-secondary/60">
            {user?.email}
          </p>
          <Link href="/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            View profile
          </Link>
          <button
            onClick={() => logout()}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-300/[0.08]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log out
          </button>
        </div>
      </details>
    </header>
  );
}
