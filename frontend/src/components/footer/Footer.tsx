import Link from "next/link";

export function Footer() {
  return (
    <>
      <footer className="border-t border-border-light bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary-hover text-gray-900 text-xs font-bold shadow-lg shadow-primary/25">
                S
              </div>
              <span className="text-sm font-semibold text-text">
                SecReports
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-xs text-text-secondary hover:text-text transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-xs text-text-secondary hover:text-text transition-colors"
              >
                Terms & Conditions
              </Link>
            </div>
            <p className="text-xs text-text-secondary">
              &copy; {new Date().getFullYear()} SecReports. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
