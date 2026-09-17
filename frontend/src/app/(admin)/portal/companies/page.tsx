"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminCompanyService } from "@/services";
import type { AdminCompany } from "@/types";

function formatCurrency(cents: number): string {
  return `R ${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminCompanyService
      .list()
      .then((res) => setCompanies(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load companies"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Companies</h1>
        <p className="text-sm text-text-secondary mt-1">All registered companies and their subscription status.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-secondary text-center">No companies registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Users</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Joined</th>
                    <th className="px-4 py-3 text-right font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c, idx) => (
                    <tr key={c.id} className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${idx % 2 === 0 ? 'bg-surface-elevated/10' : ''}`}>
                      <td className="px-4 py-3 font-medium text-text">{c.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{c.email}</td>
                      <td className="px-4 py-3 text-text-secondary">{c.subscription?.plan?.name || "Free"}</td>
                      <td className="px-4 py-3 text-text font-medium">{c.subscription?.plan ? formatCurrency(c.subscription.plan.price) : "—"}</td>
                      <td className="px-4 py-3 text-text-secondary">{c._count?.users || 0}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.subscription?.status === "active" ? "success" : "default"}>
                          {c.subscription?.status || "no subscription"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/portal/companies/${c.id}`}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
