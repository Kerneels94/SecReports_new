"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminRevenueService, adminInvoiceService } from "@/services";
import type { RevenueStats, RevenueTrend, Invoice, MonthlyInvoiceResult } from "@/types";

function formatCurrency(cents: number): string {
  return `R ${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function InvoiceStatusBadge({ status }: { status: string }) {
  const variant = status === "paid" ? "success" : status === "sent" ? "info" : status === "overdue" ? "danger" : status === "draft" ? "warning" : "default";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function AdminPortalPage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<MonthlyInvoiceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendsRes, invoicesRes] = await Promise.all([
        adminRevenueService.stats(),
        adminRevenueService.trends(),
        adminInvoiceService.list(),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setRecentInvoices(invoicesRes.data.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerateMonthly = async () => {
    setGenerating(true);
    setGenResult(null);
    setError(null);
    try {
      const res = await adminInvoiceService.generateMonthly();
      setGenResult(res.data);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invoices");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await adminInvoiceService.markAsPaid(id);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
      </div>
    );
  }

  const maxRevenue = Math.max(...trends.map((t) => t.revenue), 1);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Revenue overview and invoice management.</p>
        </div>
        <Button onClick={handleGenerateMonthly} loading={generating}>
          Generate & Send Monthly Invoices
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
          {error}
        </div>
      )}

      {genResult && (
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-success mb-2">
              Generated {genResult.length} invoice(s):
            </p>
            <div className="flex flex-wrap gap-2">
              {genResult.map((r) => (
                <Badge key={r.companyId} variant={r.status === "sent" ? "success" : "default"}>
                  {r.companyName}: {r.invoiceNumber} ({r.status})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Monthly Revenue</p>
              <p className="text-2xl font-bold text-text mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Total Revenue</p>
              <p className="text-2xl font-bold text-text mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Outstanding</p>
              <p className="text-2xl font-bold text-danger mt-1">{formatCurrency(stats.outstandingAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">Active Companies</p>
              <p className="text-2xl font-bold text-text mt-1">{stats.activeCompanies}</p>
              <p className="text-xs text-text-secondary/60 mt-0.5">{stats.overdueInvoices} overdue invoices</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trends (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">No revenue data yet.</p>
            ) : (
              <div className="flex items-end gap-2 h-48">
                {trends.map((t) => {
                  const height = maxRevenue > 0 ? (t.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={`${t.year}-${t.month}`} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-text-secondary/60">{formatCurrency(t.revenue)}</span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60 transition-all duration-300 hover:from-primary-hover"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <span className="text-[10px] text-text-secondary/60">{monthNames[parseInt(t.month) - 1]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Paid This Year</span>
                  <span className="text-sm font-semibold text-text">{stats.paidInvoicesThisYear}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Overdue</span>
                  <span className="text-sm font-semibold text-danger">{stats.overdueInvoices}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Outstanding Amount</span>
                  <span className="text-sm font-semibold text-warning">{formatCurrency(stats.outstandingAmount)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border-light pt-3">
                  <span className="text-sm text-text-secondary">Total Revenue (All Time)</span>
                  <span className="text-sm font-semibold text-text">{formatCurrency(stats.totalRevenue)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/portal/invoices"}>
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentInvoices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-secondary text-center">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Invoice</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv, idx) => (
                    <tr key={inv.id} className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${idx % 2 === 0 ? 'bg-surface-elevated/10' : ''}`}>
                      <td className="px-4 py-3 font-medium text-text">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-text-secondary">{inv.company?.name || "—"}</td>
                      <td className="px-4 py-3 text-text font-medium">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {inv.status === "sent" || inv.status === "overdue" ? (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(inv.id)}>
                            Mark Paid
                          </Button>
                        ) : (
                          <span className="text-xs text-text-secondary/50">—</span>
                        )}
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
