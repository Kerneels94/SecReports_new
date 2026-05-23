"use client";

interface MobileHeaderProps {
  user?: { name: string; email: string; role: string } | null;
  onToggleSidebar: () => void;
  onLogout?: () => void;
}

export function MobileHeader({ user, onToggleSidebar, onLogout }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-light bg-surface/80 backdrop-blur-md px-4 lg:hidden">
      <button
        onClick={onToggleSidebar}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-white/[0.06] transition-colors"
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

      <div className="flex items-center gap-1">
        {user && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-medium text-primary ring-1 ring-primary/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-white/[0.06] transition-colors"
            aria-label="Logout"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
