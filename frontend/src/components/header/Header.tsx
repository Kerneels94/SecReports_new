"use client";

import { useRef } from "react";
import Link from "next/link";

/** Marketing site header with section navigation and a mobile menu. */
export function Header() {
  const mobileNav = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    if (mobileNav.current) mobileNav.current.open = false;
  };

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href="/" aria-label="SecReports home">
          <svg className="logo-mark" aria-hidden="true">
            <use href="#i-logo" />
          </svg>
          SecReports
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#solutions">Who it&apos;s for</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/how-to">How to</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
        <div className="nav-actions">
          <Link className="signin" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary btn-sm" href="/register">
            Start free trial
          </Link>
          <details className="mobile-nav" ref={mobileNav}>
            <summary aria-label="Open menu">
              <svg className="icon" aria-hidden="true">
                <use href="#i-menu" />
              </svg>
            </summary>
            <div className="mobile-panel" onClick={closeMenu}>
              <Link href="/#solutions">Who it&apos;s for</Link>
              <Link href="/#features">Features</Link>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/how-to">How to</Link>
              <Link href="/#contact">Contact</Link>
              <Link href="/login">Sign in</Link>
              <Link className="btn btn-primary btn-sm" href="/register">
                Start free trial
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
