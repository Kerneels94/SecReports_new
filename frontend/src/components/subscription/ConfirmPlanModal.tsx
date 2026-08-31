/**
 * ConfirmPlanModal - Confirmation dialog shown before switching plans. Displays
 * the selected plan's price, when billing starts (next 25th), and requires the
 * admin to agree to the monthly payment plan before the change is applied.
 */
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { SubscriptionPlan } from "@/types";
import { BILLING_DAY, formatBillingDate, formatPrice, getNextBillingDate } from "@/lib/billing";

export interface ConfirmPlanModalProps {
  plan: SubscriptionPlan;
  open: boolean;
  onClose: () => void;
  onConfirm: (planId: string) => Promise<void> | void;
}

export function ConfirmPlanModal({ plan, open, onClose, onConfirm }: ConfirmPlanModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextBillingDate = getNextBillingDate();

  async function handleConfirm() {
    if (!agreed) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(plan.id);
      onClose();
    } catch {
      setError("Failed to update your subscription. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirm Your Subscription">
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-surface-elevated/40 ring-1 ring-border-light p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Selected Plan</p>
              <p className="text-xl font-bold text-text">{plan.name}</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatPrice(plan.price)}/mo</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-danger/10 border border-danger/20 p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text">Billing starts on {formatBillingDate(nextBillingDate)}</span> — your first payment of {formatPrice(plan.price)} is due then, and recurring on the {BILLING_DAY}th of each month.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm10 6a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text">Monthly payment plan.</span> Payments recur every month. You can change or cancel your plan later from the Billing settings.
            </p>
          </li>
        </ul>

        <label className="flex items-start gap-3 rounded-xl bg-surface ring-1 ring-border-light p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border-text text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-secondary">
            I agree to the <span className="font-medium text-text">monthly payment plan</span> for {plan.name} at {formatPrice(plan.price)}/month, with payments due on the {BILLING_DAY}th of each month.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={submitting} disabled={!agreed}>
            Confirm &amp; Upgrade
          </Button>
        </div>
      </div>
    </Modal>
  );
}
