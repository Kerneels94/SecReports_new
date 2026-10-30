/**
 * SubscriptionStatusGate - Detects whether the current company's free trial has
 * expired or its plan's report limit is reached, and drives the upgrade flow.
 *
 *  - Admins are prompted with the SubscriptionModal so they can upgrade.
 *  - Non-admins (manager/senior) see a blocking notice and stay logged in.
 *
 * The API also blocks every non-billing route for these companies, so the
 * notice/modal is the only usable screen until the plan changes.
 */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionService } from "@/services";
import { SubscriptionModal } from "./SubscriptionModal";

export interface SubscriptionStatusGateProps {
  children: React.ReactNode;
}

type BlockReason = "trial" | "reports" | null;

function BlockNotice({ reason }: { reason: BlockReason }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 ring-1 ring-border-light animate-scale-in">
        <h2 className="text-lg font-semibold text-text">
          {reason === "reports" ? "Report limit reached" : "Trial has ended"}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {reason === "reports"
            ? "Your organisation has reached its plan's report limit. Please contact your administrator to upgrade the subscription before you can continue."
            : "Your organisation's free trial has expired. Please contact your administrator to upgrade the subscription before you can continue."}
        </p>
      </div>
    </div>
  );
}

export function SubscriptionStatusGate({ children }: SubscriptionStatusGateProps) {
  const { user, logout } = useAuth();
  const [blockReason, setBlockReason] = useState<BlockReason>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | undefined>(undefined);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.companyId) {
      Promise.resolve().then(() => {
        if (!cancelled) setChecking(false);
      });
      return;
    }

    subscriptionService
      .getSubscription()
      .then((res) => {
        if (cancelled) return;
        const sub = res.data;
        const isFreePlan = (sub.plan?.price ?? 0) === 0;
        const trialExpired = Boolean(
          isFreePlan &&
            sub.trialEndsAt &&
            new Date(sub.trialEndsAt).getTime() <= Date.now(),
        );
        const reportLimit = sub.plan?.reportLimit ?? 0;
        const reports = sub.usage?.reports ?? 0;
        const reportLimitReached = reportLimit > 0 && reports >= reportLimit;

        setCurrentPlanId(sub.planId);
        setBlockReason(
          reportLimitReached ? "reports" : trialExpired ? "trial" : null,
        );
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.companyId]);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  if (!blockReason) {
    return <>{children}</>;
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin";

  if (!isAdmin) {
    if (blockReason === "trial") void logout();
    return <BlockNotice reason={blockReason} />;
  }

  return (
    <>
      <BlockNotice reason={blockReason} />
      <SubscriptionModal
        open
        reason={blockReason}
        excludePlanId={blockReason === "reports" ? currentPlanId : undefined}
        onClose={() => {}}
        onPlanChanged={() => setBlockReason(null)}
      />
    </>
  );
}
