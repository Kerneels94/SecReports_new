"use client";

interface HeaderProps {
  user?: { name: string; email: string; role: string } | null;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-4 border-b border-border-light bg-surface/80 backdrop-blur-md px-8 lg:flex">
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-text">{user.name}</p>
            <p className="text-xs text-text-secondary capitalize">{user.role}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-medium text-primary ring-1 ring-primary/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:text-text hover:bg-white/[0.06] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
