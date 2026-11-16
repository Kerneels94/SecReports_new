"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminCompanyService, subscriptionService } from "@/services";
import type { AdminCompanyDetail, Invoice, SubscriptionPlan } from "@/types";

function formatCurrency(cents: number): string {
  return `R ${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

/** "used / limit", or just "used" on an unlimited (0) plan. */
function usage(used: number, limit?: number): string {
  return limit ? `${used} / ${limit}` : `${used} (unlimited)`;
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const variant = status === "paid" ? "success" : status === "sent" ? "info" : status === "overdue" ? "danger" : status === "draft" ? "warning" : "default";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function CompanyDetailPage() {
  const [id, setId] = useState<string | null>(null);
  const [company, setCompany] = useState<AdminCompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [changing, setChanging] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window is only readable after mount (static export)
    setId(id);
    if (!id) {
      setError("Missing company id");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    adminCompanyService
      .getById(id)
      .then((res) => setCompany(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load company"))
      .finally(() => setLoading(false));
    subscriptionService
      .listPlans()
      .then((res) => setPlans(res.data.filter((p) => p.price > 0)))
      .catch(() => setPlans([]));
  }, [id]);

  async function handleChangePlan() {
    if (!id || !planId) return;
    setChanging(true);
    setPlanError(null);
    try {
      await adminCompanyService.changePlan(id, planId);
      const res = await adminCompanyService.getById(id);
      setCompany(res.data);
      setPlanId("");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Failed to change plan");
    } finally {
      setChanging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
        {error || "Company not found"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{company.name}</h1>
          <p className="text-sm text-text-secondary mt-1">{company.email}</p>
        </div>
        <Button variant="secondary" onClick={() => router.push("/portal/companies")}>
          Back to Companies
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Plan</p>
            <p className="text-lg font-bold text-text mt-1">{company.subscription?.plan?.name || "Free"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Status</p>
            <p className="text-lg font-bold text-text mt-1">
              <Badge variant={company.subscription?.status === "active" ? "success" : "default"}>
                {company.subscription?.status || "no subscription"}
              </Badge>
            </p>
            {company.subscription?.trialEndsAt && company.subscription.plan?.price === 0 && (
              <p className="text-xs text-text-secondary/60 mt-1">
                Trial ends {formatDate(company.subscription.trialEndsAt)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Price</p>
            <p className="text-lg font-bold text-text mt-1">
              {company.subscription?.plan ? formatCurrency(company.subscription.plan.price) : "—"}
              <span className="text-sm text-text-secondary font-normal">/mo</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Usage</p>
            <p className="text-sm text-text mt-1">
              Active users{" "}
              <span className="font-bold">
                {usage(
                  company.users?.filter((u) => u.status === "active").length || 0,
                  // Free plan stores 0 users but the trial caps at 3 (TRIAL_USER_LIMIT in the backend).
                  company.subscription?.plan?.price === 0 ? 3 : company.subscription?.plan?.userLimit,
                )}
              </span>
            </p>
            <p className="text-sm text-text mt-1">
              Reports{" "}
              <span className="font-bold">
                {usage(company._count?.incidents || 0, company.subscription?.plan?.reportLimit)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {company.subscription && plans.length > 0 && (
        <Card>
          <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Change plan
              <select
                className="rounded-lg border border-border-light bg-surface px-3 py-2 text-text"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                <option value="">Select a plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === company.subscription?.plan.id}>
                    {p.name} — {formatCurrency(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={handleChangePlan} disabled={!planId || changing}>
              Change plan
            </Button>
            <p className="text-xs text-text-secondary/60 sm:ml-2">
              Skips the user and report checks. Over the report limit locks the company out; over the user limit blocks new users.
            </p>
          </CardContent>
          {planError && (
            <p className="px-5 pb-4 text-sm text-danger" role="alert">{planError}</p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users ({company.users?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(!company.users || company.users.length === 0) ? (
              <p className="px-6 py-8 text-sm text-text-secondary text-center">No users.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-surface-elevated/20">
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.users.map((u, idx) => (
                      <tr key={u.id} className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${idx % 2 === 0 ? 'bg-surface-elevated/10' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-text">{u.name}</span>
                            <span className="text-xs text-text-secondary/60">{u.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge>{u.role}</Badge></td>
                        <td className="px-4 py-3"><Badge variant={u.status === "active" ? "success" : "danger"}>{u.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices ({company.invoices?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(!company.invoices || company.invoices.length === 0) ? (
              <p className="px-6 py-8 text-sm text-text-secondary text-center">No invoices.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-surface-elevated/20">
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Invoice</th>
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Due</th>
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.invoices.map((inv: Invoice, idx: number) => (
                      <tr key={inv.id} className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${idx % 2 === 0 ? 'bg-surface-elevated/10' : ''}`}>
                        <td className="px-4 py-3 font-medium text-text">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-text font-medium">{formatCurrency(inv.amount)}</td>
                        <td className="px-4 py-3 text-text-secondary">{formatDate(inv.dueDate)}</td>
                        <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
