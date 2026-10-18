"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { subscriptionService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { PlanSelectCard } from "@/components/subscription/PlanSelectCard";
import { ConfirmPlanModal } from "@/components/subscription/ConfirmPlanModal";
import type { SubscriptionPlan, CompanySubscription } from "@/types";

export default function BillingPage() {
  const { user } = useAuth();
  const canManageBilling = hasPermission(user, "billing.manage");

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
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
      setError(err instanceof Error ? err.message : "Failed to change plan. Please try again.");
    } finally {
      setChanging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text">Billing & Plan</h1>
          <p className="text-sm text-text-secondary mt-1">Loading subscription data...</p>
        </div>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-text-secondary">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Billing & Plan</h1>
        <p className="text-sm text-text-secondary mt-1">
          View your current plan and usage.{" "}
          {canManageBilling
            ? "Select a plan below to update your subscription."
            : "Contact your administrator to change your plan."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Plans</CardTitle>
            {subscription && (
              <Badge variant="success">Current: {subscription.plan.name}</Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Monthly payments are due on the 25th of each month. Upgrades take effect
            immediately; your first payment date is shown before you confirm.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-4">
            {plans
              .filter((plan) => !(subscription && plan.price === 0 && subscription.plan.price > 0))
              .map((plan) => (
                <div key={plan.id} className="w-full md:w-[calc((100%-2rem)/3)]">
                  <PlanSelectCard
                    plan={plan}
                    isCurrent={subscription?.planId === plan.id}
                    disabled={!canManageBilling || changing}
                    onSelect={() => setConfirming(plan)}
                  />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Plan</p>
                <p className="font-medium text-text">{subscription.plan.name}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Status</p>
                <Badge variant={subscription.status === "active" ? "success" : "default"}>
                  {subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Users Used</p>
                <p className="font-medium text-text">
                  {subscription.usage?.users ?? 0}
                  {subscription.plan.userLimit > 0 && ` / ${subscription.plan.userLimit}`}
                  {subscription.plan.userLimit === 0 && " (unlimited)"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Monthly invoices are auto-generated for active paid subscriptions and are due on
            the 25th of each month.
          </p>
        </CardContent>
      </Card>

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
