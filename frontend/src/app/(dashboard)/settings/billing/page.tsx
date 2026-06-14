/**
 * Billing page — displays current plan and usage. Upgrade, cancellation, and
 * payment history are replaced by a monthly invoicing dashboard (TBD).
 * @route /settings/billing
 */
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
  },
];

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Billing & Plan</h1>
        <p className="text-sm text-text-secondary mt-1">View your current plan and usage. Monthly invoicing coming soon.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Plans</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col rounded-xl p-5 bg-surface ring-1 ring-border-light"
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Monthly invoicing dashboard is under development. You will be able to send, track, and manage invoices for companies here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
