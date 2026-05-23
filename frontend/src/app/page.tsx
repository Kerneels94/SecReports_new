"use client";

import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    limit: "20 reports",
    description: "For small teams getting started with incident tracking.",
    features: [
      "Up to 20 incident reports",
      "Basic incident tracking",
      "Email notifications",
      "Single user",
      "Standard support",
    ],
    cta: "Get Started",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "R 299",
    period: "/month",
    limit: "100 reports",
    description: "For growing security teams with regular reporting needs.",
    features: [
      "Up to 100 incident reports",
      "Advanced incident tracking",
      "Email notifications",
      "Up to 5 users",
      "Evidence uploads",
      "Report export (CSV/PDF)",
      "Priority support",
    ],
    cta: "Start Trial",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "R 999",
    period: "/month",
    limit: "Unlimited reports",
    description: "For large security operations with high-volume reporting.",
    features: [
      "Unlimited incident reports",
      "Full incident lifecycle management",
      "Email notifications",
      "Unlimited users",
      "Evidence uploads",
      "Report export (CSV/PDF)",
      "API access",
      "Dedicated account manager",
      "24/7 priority support",
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlighted: false,
  },
];

const features = [
  {
    title: "Incident Tracking",
    description: "Log, categorize, and track every incident from report to resolution.",
  },
  {
    title: "Evidence Management",
    description: "Upload and manage photos, videos, and documents for each case.",
  },
  {
    title: "Team Collaboration",
    description: "Assign investigators, add comments, and keep everyone in the loop.",
  },
  {
    title: "Audit Trail",
    description: "Immutable activity logs for compliance and review purposes.",
  },
  {
    title: "Reports & Export",
    description: "Generate PDF and CSV reports for clients, management, or regulators.",
  },
  {
    title: "Role-Based Access",
    description: "Control permissions with Reporter, Investigator, Manager, and Admin roles.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.04),transparent_50%)] pointer-events-none" />
      <header className="sticky top-0 z-50 border-b border-border-light bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-gray-900 text-sm font-bold shadow-lg shadow-primary/25">
              S
            </div>
            <span className="text-lg font-bold text-text">SecReports</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-text-secondary hover:text-text transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-text-secondary hover:text-text transition-colors">Pricing</a>
            <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">Sign In</Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:bg-primary-hover transition-all duration-150"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/[0.08] px-4 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Incident Management Platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-6xl">
              Incident Reporting for{" "}
              <span className="text-primary">Security Professionals</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              SecReports helps private security companies log, track, and resolve
              incidents efficiently. From access control breaches to patrol findings —
              keep your sites secure with a dedicated reporting platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-primary to-primary-hover px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:from-primary-hover hover:to-primary transition-all duration-150"
              >
                Start Free Trial
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-border-light bg-surface/50 px-6 py-3 text-sm font-semibold text-text hover:bg-surface hover:border-border transition-all duration-150"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border-light bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">Everything you need to manage incidents</h2>
            <p className="mt-4 text-text-secondary">
              Built specifically for private security companies managing multiple sites and clients.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="group flex flex-col gap-2 rounded-xl bg-surface p-6 ring-1 ring-border-light hover:ring-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/20 mb-1">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-text group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-border-light">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">Simple, transparent pricing</h2>
            <p className="mt-4 text-text-secondary">
              Choose the plan that fits your team size and reporting volume.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`group flex flex-col rounded-2xl p-8 transition-all duration-200 ${
                  tier.highlighted
                    ? "bg-surface-elevated ring-2 ring-primary/30 shadow-2xl shadow-primary/10 scale-105 hover:ring-primary/50"
                    : "bg-surface ring-1 ring-border-light hover:ring-border hover:shadow-lg hover:shadow-black/20"
                }`}
              >
                <div>
                  <h3 className="text-lg font-semibold text-text">{tier.name}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{tier.description}</p>
                  <p className="mt-6">
                    <span className="text-4xl font-bold text-text">{tier.price}</span>
                    {tier.period && <span className="text-sm text-text-secondary ml-1">{tier.period}</span>}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{tier.limit}</p>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`mt-8 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all duration-150 ${
                    tier.highlighted
                      ? "bg-gradient-to-r from-primary to-primary-hover text-gray-900 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:from-primary-hover hover:to-primary"
                      : "border border-border-light text-text hover:bg-surface-elevated hover:border-border"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border-light bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-gray-900 text-xs font-bold shadow-lg shadow-primary/25">
                S
              </div>
              <span className="text-sm font-semibold text-text">SecReports</span>
            </div>
            <p className="text-xs text-text-secondary">
              &copy; {new Date().getFullYear()} SecReports. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
