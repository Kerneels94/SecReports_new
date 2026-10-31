import Link from "next/link";
import type { ReactNode } from "react";
import { SiteIcons } from "@/components/site/SiteIcons";

type AuthShellProps = {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  ticks: string[];
  nextSteps?: string[];
  children: ReactNode;
};

/** Split-screen shell shared by the public sign-in and account-recovery pages. */
export function AuthShell({
  eyebrow,
  title,
  lead,
  ticks,
  nextSteps,
  children,
}: AuthShellProps) {
  return (
    <div className="site-redesign">
      <SiteIcons />
      <div className="auth">
        <aside className="auth-aside grid-glow">
          <Link className="brand" href="/">
            <svg className="logo-mark" aria-hidden="true">
              <use href="#i-logo" />
            </svg>
            SecReports
          </Link>
          <div>
            <span className="eyebrow">
              <span className="dot" />
              {eyebrow}
            </span>
            <h2>{title}</h2>
            {lead && <p className="lead">{lead}</p>}
            <ul className="ticks">
              {ticks.map((tick) => (
                <li key={tick}>
                  <span className="tick">
                    <svg className="icon" aria-hidden="true">
                      <use href="#i-check" />
                    </svg>
                  </span>
                  {tick}
                </li>
              ))}
            </ul>
            {nextSteps && (
              <ol className="next-steps" aria-label="What happens next">
                {nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </div>
          <p className="auth-aside-foot">
            © 2026 SecReports. All rights reserved.
          </p>
        </aside>
        <div className="auth-main">
          <div className="auth-card">
            <Link className="brand auth-mobile-brand" href="/">
              <svg className="logo-mark" aria-hidden="true">
                <use href="#i-logo" />
              </svg>
              SecReports
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
