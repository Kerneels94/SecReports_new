"use client";

/**
 * MobileHeader - The top navigation bar for mobile viewports.
 * Provides the sidebar toggle; profile and logout live in the sidebar.
 */

/** Props for the MobileHeader component */
interface MobileHeaderProps {
  onToggleSidebar: () => void;
}

/** Mobile header bar with sidebar toggle. Visible only on small screens (< lg). */
export function MobileHeader({ onToggleSidebar }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border-light bg-surface/80 backdrop-blur-md px-4 lg:hidden">
      <button
        onClick={onToggleSidebar}
        className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
    </header>
  );
}
