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
        // Same shape as the landing page .price-card: 18px corners, 22px padding, featured card lifted 10px.
        "flex flex-col rounded-[18px] border bg-surface p-[22px] transition-colors duration-200",
        highlighted
          ? "-translate-y-2.5 border-primary/50 shadow-[0_40px_80px_-40px_rgba(134,239,172,0.4)]"
          : isCurrent
            ? "border-primary/40"
            : "border-border-light hover:border-primary/25",
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
          {isCurrent && <Badge variant="success">Current</Badge>}
          {highlighted && <Badge variant="info">Popular</Badge>}
        </div>
        <p className="mt-2 min-h-12 text-sm text-text-secondary">{wording.description}</p>
        <p className="mt-5 leading-none">
          <span className="text-[34px] font-bold tracking-[-0.04em] text-text">{formatPrice(plan.price)}</span>
          {plan.price > 0 && (
            <span className="ml-1 text-sm text-text-secondary">/month</span>
          )}
        </p>
        <p className="mt-2 text-sm text-text-subtle">{wording.limit}</p>
      </div>
      <ul className="mb-7 mt-6 flex-1 space-y-3">
        {wording.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-text-secondary">
            <span data-tick className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
              <svg className="h-[13px] w-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled || isCurrent}
        className={cn(
          "mt-auto block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all duration-150",
          highlighted
            ? "cursor-pointer bg-primary-fill text-white shadow-lg shadow-primary-fill/20 hover:shadow-xl hover:shadow-primary-fill/30 hover:bg-primary-fill-hover"
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
