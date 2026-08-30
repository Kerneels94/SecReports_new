"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { subscriptionService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionPlan, CompanySubscription } from "@/types";

function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return `R ${(price / 100).toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}

function parseFeatures(features: string): string[] {
  try {
    return JSON.parse(features);
  } catch {
    return [];
  }
}

export default function BillingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
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

  async function handleChangePlan(planId: string) {
    if (!subscription || planId === subscription.planId) return;
    setChanging(planId);
    setError(null);
    try {
      const res = await subscriptionService.changePlan(planId);
      setSubscription(res.data);
    } catch {
      setError("Failed to change plan. Please try again.");
    } finally {
      setChanging(null);
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
          View your current plan and usage. {isAdmin ? "Select a plan below to update your subscription." : "Monthly invoices are generated and sent automatically."}
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
              <Badge variant="success">
                Current: {subscription.plan.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = subscription?.planId === plan.id;
              const isChangingThis = changing === plan.id;
              const features = parseFeatures(plan.features);

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-xl p-5 ring-1 ${
                    isCurrent
                      ? "bg-primary/5 ring-primary"
                      : "bg-surface ring-border-light"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
                    {isCurrent && (
                      <Badge variant="success">Current</Badge>
                    )}
                  </div>
                  <p className="mt-1">
                    <span className="text-3xl font-bold text-text">{formatPrice(plan.price)}</span>
                    {plan.price > 0 && <span className="text-sm text-text-secondary ml-1">/month</span>}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {plan.siteLimit === 0 ? "Unlimited sites" : `Up to ${plan.siteLimit} sites`}
                    {" · "}
                    {plan.userLimit === 0 ? "Unlimited users" : `Up to ${plan.userLimit} users`}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isAdmin && !isCurrent && (
                    <button
                      onClick={() => handleChangePlan(plan.id)}
                      disabled={isChangingThis}
                      className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isChangingThis ? "Changing..." : plan.price > subscription!.plan.price ? "Upgrade" : "Downgrade"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-text-secondary">Sites Used</p>
                <p className="font-medium text-text">
                  {subscription.usage?.sites ?? 0}
                  {subscription.plan.siteLimit > 0 && ` / ${subscription.plan.siteLimit}`}
                  {subscription.plan.siteLimit === 0 && " (unlimited)"}
                </p>
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
            Monthly invoices are auto-generated for active paid subscriptions. Super admins can manage, send, and track invoices from the admin panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
