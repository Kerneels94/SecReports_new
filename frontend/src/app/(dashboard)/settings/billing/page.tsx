"use client";

import { useEffect, useState } from "react";
import { subscriptionService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { PlanSelectCard } from "@/components/subscription/PlanSelectCard";
import { ConfirmPlanModal } from "@/components/subscription/ConfirmPlanModal";
import { formatPrice } from "@/lib/billing";
import type { SubscriptionPlan, CompanySubscription } from "@/types";

const PANEL = "rounded-[18px] border border-border-light bg-surface";
const STAT = `${PANEL} flex flex-col p-[22px]`;

export default function BillingPage() {
  const { user } = useAuth();
  const canManageBilling = hasPermission(user, "billing.manage");

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [confirming, setConfirming] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [plansRes, subRes] = await Promise.all([
          subscriptionService.listPlans(),
          subscriptionService.getSubscription(),
        ]);
        setPlans(plansRes.data);
        setSubscription(subRes.data);
      } catch {
        setError("Failed to load subscription data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleConfirmPlan(planId: string) {
    if (!subscription || planId === subscription.planId) return;
    setChanging(true);
    setError(null);
    try {
      const res = await subscriptionService.changePlan(planId);
      setSubscription(res.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change plan. Please try again.",
      );
    } finally {
      setChanging(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <h1 className="text-[clamp(26px,2.6vw,32px)] font-bold tracking-[-0.03em] text-text">
          Billing &amp; Plan
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">Loading subscription data...</p>
        <div className={`${PANEL} mt-6 flex items-center justify-center py-10 text-sm text-text-secondary`}>
          Loading...
        </div>
      </div>
    );
  }

  const availablePlans = plans.filter(
    (plan) => !subscription || plan.price >= subscription.plan.price,
  );

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[clamp(26px,2.6vw,32px)] font-bold tracking-[-0.03em] text-text">
          Billing &amp; Plan
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          View your current plan and usage.{" "}
          {canManageBilling
            ? "Choose a plan below to change your subscription."
            : "Contact your administrator to change your plan."}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/20 bg-danger/10 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {subscription && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className={STAT}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-secondary">Current plan</span>
              <span className="rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-0.5 text-[11px] font-semibold capitalize text-primary">
                {subscription.status}
              </span>
            </div>
            <p className="mt-[18px] text-[36px] font-semibold leading-none tracking-[-0.03em] text-text">
              {subscription.plan.name}
            </p>
            <p className="mt-2.5 text-[13px] text-text-secondary/60">
              {subscription.plan.price > 0
                ? `${formatPrice(subscription.plan.price)} /month`
                : "No monthly charge"}
            </p>
          </article>
          <article className={STAT}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-secondary">Users</span>
              <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-primary/20 bg-primary/[0.08] text-primary">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </span>
            </div>
            <p className="mt-[18px] font-mono text-[36px] font-semibold leading-none tracking-[-0.03em] text-text">
              {subscription.usage?.users ?? 0}
            </p>
            <p className="mt-2.5 text-[13px] text-text-secondary/60">
              {subscription.plan.userLimit > 0
                ? `Of ${subscription.plan.userLimit} seats`
                : "Unlimited on your plan"}
            </p>
          </article>
          <article className={STAT}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-secondary">Payment due</span>
              <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-primary/20 bg-primary/[0.08] text-primary">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </span>
            </div>
            <p className="mt-[18px] font-mono text-[36px] font-semibold leading-none tracking-[-0.03em] text-text">
              25th
            </p>
            <p className="mt-2.5 text-[13px] text-text-secondary/60">Of each month</p>
          </article>
        </div>
      )}

      <p className="mb-4 flex items-start gap-2.5 rounded-xl border border-border-light bg-primary/[0.05] px-4 py-3.5 text-sm text-text-secondary">
        <svg className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
        </svg>
        Monthly payments are due on the 25th of each month. Upgrades take effect
        immediately; your first payment date is shown before you confirm.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {availablePlans.map((plan) => (
          <PlanSelectCard
            key={plan.id}
            plan={plan}
            isCurrent={subscription?.planId === plan.id}
            disabled={!canManageBilling || changing}
            onSelect={() => setConfirming(plan)}
          />
        ))}
      </div>

      <div className={`${PANEL} p-[22px]`}>
        <h2 className="text-[17px] font-semibold text-text">Invoices</h2>
        <div className="px-4 pb-3 pt-7 text-center">
          <span className="mx-auto mb-3.5 grid h-9 w-9 place-items-center rounded-[10px] border border-primary/20 bg-primary/[0.08] text-primary">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </span>
          <b className="block text-base font-semibold text-text">No invoices yet</b>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-sm text-text-secondary">
            Monthly invoices are auto-generated for active paid subscriptions and
            are due on the 25th of each month.
          </p>
        </div>
      </div>

      {confirming && (
        <ConfirmPlanModal
          plan={confirming}
          open
          onClose={() => setConfirming(null)}
          onConfirm={handleConfirmPlan}
        />
      )}
    </div>
  );
}
