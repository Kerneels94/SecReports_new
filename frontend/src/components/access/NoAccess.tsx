/**
 * NoAccess — the shared "you can't be here" block shown when the signed-in
 * user's role lacks the permission required by a route.
 */
"use client";

export function NoAccess({
  title = "Access required",
  message = "You don't have permission to access this page.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl bg-surface ring-1 ring-border-light">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900/30 ring-1 ring-red-500/20">
          <svg className="h-5 w-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01" /><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm text-danger font-medium">{title}</p>
          <p className="mt-1 text-xs text-text-secondary">{message}</p>
        </div>
      </div>
    </div>
  );
}