"use client";

import { useState } from "react";
import Link from "next/link";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border-light bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <a href="/" className="flex items-center">
            <img src="/logo.svg" alt="SecReports" className="h-16 w-auto" />
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="/#features"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              Features
            </a>
            <a
              href="/#pricing"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/how-to"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              How To
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:bg-primary-hover transition-all duration-150"
            >
              Get Started
            </Link>
          </nav>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-border-light bg-surface md:hidden animate-slide-up">
            <div className="flex flex-col gap-1 px-6 py-4">
              <a
                href="/#features"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
              >
                Features
              </a>
              <a
                href="/#pricing"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
              >
                Pricing
              </a>
              <Link
                href="/how-to"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
              >
                How To
              </Link>
              <hr className="my-1 border-border-light" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:text-primary-hover hover:bg-surface-elevated transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-gray-900 text-center hover:bg-primary-hover transition-all duration-150"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
