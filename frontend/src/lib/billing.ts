import type { SubscriptionPlan } from "@/types";

/**
 * Billing helpers shared across the subscription UI.
 * Billing day of the month on which monthly payments are due.
 */
export const BILLING_DAY = 25;

/** Plan marketing copy: one-line description, limit line, and the feature list. */
export interface PlanWording {
  description: string;
  limit: string;
  features: string[];
}

/** Returns the Date of the next billing day (the 25th of the current or next month). */
export function getNextBillingDate(from: Date = new Date()): Date {
  const base = new Date(from);
  const next = new Date(base);
  if (base.getDate() < BILLING_DAY) {
    next.setDate(BILLING_DAY);
  } else {
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    next.setDate(BILLING_DAY);
  }
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Formats a price in cents into a ZAR display string with thousands separators. */
export function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return `R ${Math.round(price / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

/** Per-plan wording (description, limit, features) matching the landing page pricing tiers. */
export const PLAN_WORDING: Record<string, PlanWording> = {
  Free: {
    description: "Full access to all features — with a 3-user limit during your trial.",
    limit: "14-day trial",
    features: [
      "Unlimited guarding sites",
      "Up to 3 users",
      "All features included",
      "14-day free trial, no credit card",
    ],
  },
  Professional: {
    description: "For growing security teams managing multiple sites.",
    limit: "Up to 15 sites",
    features: [
      "Up to 15 guarding sites",
      "Up to 5 user accounts",
      "100 incident reports",
      "CSV & PDF export",
      "Priority support",
    ],
  },
  Enterprise: {
    description: "For large security operations with unlimited site coverage.",
    limit: "Unlimited sites",
    features: [
      "Unlimited guarding sites",
      "Unlimited users",
      "Unlimited reports",
      "CSV & PDF export",
      "24/7 priority support",
    ],
  },
};

function parseFeatures(features: string): string[] {
  try {
    return JSON.parse(features);
  } catch {
    return [];
  }
}

/** Returns the plan wording matching the landing page, falling back to plan limits. */
export function planWording(
  plan: Pick<SubscriptionPlan, "name" | "siteLimit" | "userLimit" | "features">,
): PlanWording {
  const known = PLAN_WORDING[plan.name];
  if (known) return known;
  return {
    description:
      plan.siteLimit === 0
        ? "For organisations with unlimited site coverage."
        : `For teams managing up to ${plan.siteLimit} sites.`,
    limit:
      plan.siteLimit === 0 ? "Unlimited sites" : `Up to ${plan.siteLimit} sites`,
    features: parseFeatures(plan.features),
  };
}

/** Formats a date into a readable label, e.g. "25 Aug 2026". */
export function formatBillingDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
