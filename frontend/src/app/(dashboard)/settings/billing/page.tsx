"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { paymentService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  {
    id: 1,
    name: "Starter",
    price: "Free",
    period: "",
    limit: "20 reports",
    reports: 20,
    users: 1,
    features: ["Basic incident tracking", "Email notifications", "Standard support"],
    cta: "Current Plan",
  },
  {
    id: 2,
    name: "Professional",
    price: "R 800",
    period: "/month",
    limit: "50 reports",
    reports: 50,
    users: 5,
    features: ["Everything in Starter", "Evidence uploads", "CSV & PDF export", "Priority support"],
    cta: "Upgrade",
  },
  {
    id: 3,
    name: "Enterprise",
    price: "R 1,500",
    period: "/month",
    limit: "Unlimited",
    reports: 0,
    users: 0,
    features: ["Everything in Professional", "Full incident lifecycle", "API access", "24/7 priority support"],
    cta: "Upgrade",
  },
];

export default function BillingPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [subscription, setSubscription] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isOwner = user?.role === "owner";
  const callback = searchParams.get("callback");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, historyRes] = await Promise.all([
        paymentService.getSubscription(),
        paymentService.history(),
      ]);
      setSubscription(subRes.data);
      setPaymentHistory(historyRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (callback === "1" && searchParams.get("reference")) {
      router.replace("/settings/billing");
    }
  }, [callback, searchParams, router]);

  const handleUpgrade = async (planId: number) => {
    setUpgrading(true);
    setError(null);
    try {
      const res = await paymentService.upgrade(planId);
      window.location.href = res.data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start upgrade");
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      await paymentService.cancel();
      await fetchData();
      setCancelModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const currentPlanId = subscription?.planId || 1;
  const isCancelled = subscription?.status === "cancelled";
  const usage = subscription?.usage || { reports: 0, users: 0 };
  const currentPlan = plans.find((p) => p.id === currentPlanId) || plans[0];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Billing & Plan</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your subscription and payment history.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
          {error}
        </div>
      )}

      {callback === "1" && (
        <div className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="status">
          Payment successful! Your plan has been upgraded.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={isCancelled ? "danger" : "success"}>
              {isCancelled ? "Cancelled" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xl font-bold text-text">{currentPlan.name}</p>
              <p className="text-sm text-text-secondary">
                {currentPlan.price}{currentPlan.period} &middot; {currentPlan.limit}
              </p>
            </div>
            {subscription?.currentPeriodEnd && !isCancelled && (
              <p className="text-xs text-text-secondary">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Reports used</span>
                <span className="text-text font-medium">
                  {usage.reports}{currentPlan.reports > 0 ? ` / ${currentPlan.reports}` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-300"
                  style={{
                    width: currentPlan.reports > 0
                      ? `${Math.min((usage.reports / currentPlan.reports) * 100, 100)}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Users</span>
                <span className="text-text font-medium">
                  {usage.users}{currentPlan.users > 0 ? ` / ${currentPlan.users}` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-300"
                  style={{
                    width: currentPlan.users > 0
                      ? `${Math.min((usage.users / currentPlan.users) * 100, 100)}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          {isCancelled && (
            <div className="rounded-lg bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300 ring-1 ring-yellow-500/20">
              Your subscription has been cancelled. You are now on the Starter plan.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isFree = plan.id === 1;
              const isDowngrade = plan.id < currentPlanId && !isFree;
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-xl p-5 transition-all duration-200 ${
                    isCurrent
                      ? "bg-surface-elevated ring-2 ring-primary/30"
                      : "bg-surface ring-1 ring-border-light hover:ring-border"
                  }`}
                >
                  <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
                  <p className="mt-1">
                    <span className="text-3xl font-bold text-text">{plan.price}</span>
                    {plan.period && <span className="text-sm text-text-secondary ml-1">{plan.period}</span>}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{plan.limit}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "secondary" : "primary"}
                    disabled={isCurrent || upgrading || !isOwner}
                    loading={upgrading}
                    onClick={() => handleUpgrade(plan.id)}
                    className="mt-4 w-full"
                  >
                    {isCurrent ? "Current Plan" : !isOwner ? "Contact Owner" : "Upgrade"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-text-secondary">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light text-left text-text-secondary">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p) => (
                    <tr key={p.id} className="border-b border-border-light/50 text-text">
                      <td className="py-2.5">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="py-2.5">R {(p.amount / 100).toFixed(2)}</td>
                      <td className="py-2.5 font-mono text-xs">{p.reference}</td>
                      <td className="py-2.5 capitalize">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isCancelled && isOwner && currentPlanId !== 1 && (
        <div className="flex justify-end">
          <Button variant="danger" onClick={() => setCancelModalOpen(true)}>
            Cancel Subscription
          </Button>
        </div>
      )}

      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Subscription">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Are you sure? Your subscription will be cancelled and you'll revert to the Starter plan.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
              Keep Plan
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              Yes, Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
