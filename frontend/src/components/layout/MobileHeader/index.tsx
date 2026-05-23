"use client";

interface MobileHeaderProps {
  user?: { name: string; email: string; role: string } | null;
  onToggleSidebar: () => void;
  onLogout?: () => void;
}

export function MobileHeader({ user, onToggleSidebar, onLogout }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
      <button
        onClick={onToggleSidebar}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-sm font-bold text-primary">
          S
        </div>
        <span className="text-base font-semibold text-text">SecReports</span>
      </div>

      {user && (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      {onLogout && (
        <button
          onClick={onLogout}
          className="ml-1 text-sm text-text-secondary hover:text-text transition-colors"
        >
          Logout
        </button>
      )}
    </header>
  );
}
