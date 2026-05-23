"use client";

interface HeaderProps {
  user?: { name: string; email: string; role: string } | null;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-4 border-b border-border bg-surface px-8 lg:flex">
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-text">{user.name}</p>
            <p className="text-xs text-text-secondary capitalize">{user.role}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
