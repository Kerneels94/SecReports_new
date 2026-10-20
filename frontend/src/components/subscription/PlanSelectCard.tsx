/**
 * PlanSelectCard - A subscription package card styled to match the landing page
 * pricing tiers. Displays the plan details and an action to select it.
 */
"use client";

import type { SubscriptionPlan } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatPrice, planWording } from "@/lib/billing";

export interface PlanSelectCardProps {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function PlanSelectCard({
  plan,
  isCurrent,
  disabled,
  onSelect,
}: PlanSelectCardProps) {
  const wording = planWording(plan);
  const highlighted = plan.highlighted && !isCurrent;

  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl p-6 transition-all duration-200",
        highlighted
          ? "bg-surface-elevated ring-2 ring-primary/30 shadow-2xl shadow-primary/10 scale-105 hover:ring-primary/50"
          : isCurrent
            ? "bg-surface ring-2 ring-primary/40"
            : "bg-surface ring-1 ring-border-light hover:ring-border hover:shadow-lg hover:shadow-black/20",
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
          {isCurrent && <Badge variant="success">Current</Badge>}
          {highlighted && <Badge variant="info">Popular</Badge>}
        </div>
        <p className="mt-1 text-sm text-text-secondary">{wording.description}</p>
        <p className="mt-4">
          <span className="text-4xl font-bold text-text">{formatPrice(plan.price)}</span>
          {plan.price > 0 && (
            <span className="text-sm text-text-secondary ml-1">/month</span>
          )}
        </p>
        <p className="mt-1 text-sm text-text-secondary">{wording.limit}</p>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {wording.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled || isCurrent}
        className={cn(
          "mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all duration-150",
          highlighted
            ? "cursor-pointer bg-linear-to-r from-primary to-primary-hover text-gray-900 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:from-primary-hover hover:to-primary"
            : isCurrent
              ? "cursor-default border border-border-light text-text-secondary"
              : "cursor-pointer border border-border-light text-text hover:bg-surface-elevated hover:border-border",
        )}
      >
        {isCurrent ? "Current Plan" : highlighted ? "Choose Plan" : "Choose Plan"}
      </button>
    </div>
  );
}
