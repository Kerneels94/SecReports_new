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
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              S
            </div>
            <span className="text-lg font-bold text-text">SecReports</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-text-secondary hover:text-text transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-text-secondary hover:text-text transition-colors">Pricing</a>
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">Sign In</Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
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
                className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
              >
                Start Free Trial
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-text hover:bg-surface-secondary transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">Everything you need to manage incidents</h2>
            <p className="mt-4 text-text-secondary">
              Built specifically for private security companies managing multiple sites and clients.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-secondary p-6">
                <h3 className="text-base font-semibold text-text">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-border">
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
                className={`flex flex-col rounded-2xl border p-8 ${
                  tier.highlighted
                    ? "border-primary bg-surface shadow-lg scale-105"
                    : "border-border bg-surface"
                }`}
              >
                <div>
                  <h3 className="text-lg font-semibold text-text">{tier.name}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{tier.description}</p>
                  <p className="mt-6">
                    <span className="text-4xl font-bold text-text">{tier.price}</span>
                    {tier.period && <span className="text-sm text-text-secondary">{tier.period}</span>}
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
                  className={`mt-8 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    tier.highlighted
                      ? "bg-primary text-white hover:bg-primary-hover"
                      : "border border-border text-text hover:bg-surface-secondary"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-white text-xs font-bold">
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
