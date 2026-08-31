/**
 * SubscriptionStatusGate - Detects whether the current company's free trial has
 * expired and drives the admin subscription modal accordingly.
 *
 *  - Admins with an expired trial are prompted with the SubscriptionModal.
 *  - Non-admins (manager/senior) whose trial has expired see a blocking notice
 *    and are logged out, since their access is revoked until the admin subscribes.
 */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionService } from "@/services";
import { SubscriptionModal } from "./SubscriptionModal";

export interface SubscriptionStatusGateProps {
  children: React.ReactNode;
}

export function SubscriptionStatusGate({ children }: SubscriptionStatusGateProps) {
  const { user, logout } = useAuth();
  const [trialExpired, setTrialExpired] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
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
        const planPrice = sub.plan?.price ?? 0;
        const isFreePlan = planPrice === 0;
        const expired = Boolean(
          isFreePlan &&
            sub.trialEndsAt &&
            new Date(sub.trialEndsAt).getTime() <= Date.now(),
        );
        setTrialExpired(expired);
        setSubscribed(!isFreePlan);
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.companyId]);

  if (checking || !user) {
    return <>{children}</>;
  }

  if (trialExpired && user.role !== "admin" && user.role !== "superadmin") {
    void logout();
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
        <div className="w-full max-w-md rounded-xl bg-surface p-6 ring-1 ring-border-light animate-scale-in">
          <h2 className="text-lg font-semibold text-text">Trial has ended</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Your organisation&apos;s free trial has expired. Please contact your administrator
            to upgrade the subscription before you can continue.
          </p>
        </div>
      </div>
    );
  }

  if (trialExpired && !subscribed) {
    return (
      <>
        <SubscriptionModal
          open
          onClose={() => setTrialExpired(false)}
          onPlanChanged={() => setTrialExpired(false)}
        />
        {children}
      </>
    );
  }

  return <>{children}</>;
}
