/**
 * SubscriptionModal - Guides an admin through choosing a paid subscription plan
 * when their company's free trial has ended (or as an explicit action).
 *
 * Two steps:
 *  1. Plan selection (using PlanSelectCard)
 *  2. Confirmation — shows the price, when billing starts (next 25th), and
 *     requires agreement to the monthly payment plan before switching.
 */
"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { subscriptionService } from "@/services";
import type { SubscriptionPlan } from "@/types";
import { PlanSelectCard } from "./PlanSelectCard";
import { ConfirmPlanModal } from "./ConfirmPlanModal";

export interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  onPlanChanged?: () => void;
  /** Why the upgrade is being requested; changes the intro copy. */
  reason?: "trial" | "reports";
  /** Plan the company is already on, hidden from the choices. */
  excludePlanId?: string;
}

interface PlanWithStatus extends SubscriptionPlan {
  isCurrent?: boolean;
}

export function SubscriptionModal({
  open,
  onClose,
  onPlanChanged,
  reason = "trial",
  excludePlanId,
}: SubscriptionModalProps) {
  const [plans, setPlans] = useState<PlanWithStatus[]>([]);
  const [confirming, setConfirming] = useState<PlanWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    subscriptionService
      .listPlans()
      .then((res) => {
        if (cancelled) return;
        setPlans(res.data);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load subscription plans.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleConfirm(planId: string) {
    await subscriptionService.changePlan(planId);
    onPlanChanged?.();
    onClose();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Update Your Subscription"
        className="max-w-3xl"
      >
        <p className="text-sm text-text-secondary mb-5">
          {reason === "reports"
            ? "Your organisation has reached its report limit. Choose an upgraded plan to keep creating and viewing reports."
            : "Your free trial has come to an end. Choose a plan below to continue using your account. Selecting a paid plan starts a monthly subscription."}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 border border-danger/20 p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
          </div>
        ) : (
          <div className="flex justify-center gap-5">
            {plans
              .filter((plan) => plan.price > 0 && plan.id !== excludePlanId)
              .map((plan) => (
                <div key={plan.id} className="mt-3">
                  <PlanSelectCard
                    plan={plan}
                    isCurrent={Boolean(plan.isCurrent)}
                    onSelect={() => setConfirming(plan)}
                  />
                </div>
              ))}
          </div>
        )}
      </Modal>

      {confirming && (
        <ConfirmPlanModal
          plan={confirming}
          open
          onClose={() => setConfirming(null)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
