"use client";

import { useSyncExternalStore } from "react";

const html = () => document.documentElement;
/** Re-render when <html data-theme> changes (set here or by app/layout.tsx's pre-paint script). */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(html(), { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const read = () => (html().dataset.theme === "light" ? "light" : "dark");

/** Sun/moon button that flips the app between dark (default) and light. */
export function ThemeToggle() {
  // Server snapshot "dark" matches the prerendered HTML; the client value takes over after hydration.
  const theme = useSyncExternalStore(subscribe, read, () => "dark");
  const next = theme === "light" ? "dark" : "light";

  const toggle = () => {
    html().dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage blocked: theme still applies for this page view */
    }
  };

  return (
    <button
      onClick={toggle}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border text-text transition-colors hover:bg-surface"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "light" ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
