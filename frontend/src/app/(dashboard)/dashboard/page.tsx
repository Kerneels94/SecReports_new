"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { reportService, exportService } from "@/services";
import { IncidentPieChart, YearlyTrendChart } from "./components/DashboardCharts";
import { useAuth } from "@/hooks/useAuth";
import type { TrialStatus } from "@/types";

export function aggregateYearly(data: { month: string; count: number }[]): { month: string; count: number }[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const totals = new Array(12).fill(0);
  for (const d of data) {
    const i = Number(d.month.slice(5, 7)) - 1;
    totals[i] += d.count;
  }
  return totals.map((count, i) => ({ month: monthNames[i], count }));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [positiveCount, setPositiveCount] = useState(0);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [chartMode, setChartMode] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, monthlyRes] = await Promise.all([
        reportService.summary(),
        reportService.monthlyStats(),
      ]);
      setTotal(summaryRes.data.total);
      setAttemptedCount(summaryRes.data.attemptedCount);
      setPositiveCount(summaryRes.data.positiveCount);
      setTrial(summaryRes.data.trial);
      setMonthlyData(monthlyRes.data);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const chartData = useMemo(() => {
    return chartMode === "yearly" ? aggregateYearly(monthlyData) : monthlyData;
  }, [monthlyData, chartMode]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const result = await exportService.downloadYearlyPdf();
      const url = URL.createObjectURL(result);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename || "yearly-crime-stats.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={fetchSummary}
          className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-text border border-border hover:bg-surface-elevated transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: "Attempted incidents", value: attemptedCount, color: "text-warning", gradient: "from-amber-500/10 to-amber-500/5", icon: "M12 9v2m0 4h.01m21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Positive incidents", value: positiveCount, color: "text-success", gradient: "from-emerald-500/10 to-emerald-500/5", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {trial?.isTrial && trial.daysRemaining <= 2 && !trial.isExpired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
          <svg className="h-5 w-5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-200">
            Your free trial ends in <strong>{trial.daysRemaining} day{trial.daysRemaining === 1 ? "" : "s"}</strong>.{" "}
            <a href="/settings/billing" className="underline font-medium hover:text-amber-100">Upgrade now</a> to keep full access.
          </div>
        </div>
      )}

      {trial?.isExpired && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 flex items-center gap-3">
          <svg className="h-5 w-5 shrink-0 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-red-200">
            Your free trial has ended. Some features may be limited.{" "}
            <a href="/settings/billing" className="underline font-medium hover:text-red-100">Upgrade now</a> to restore full access.
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Overview of incident reports</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated/40 text-xs text-text-secondary ring-1 ring-border-light">
          <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Live
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {statCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient}`} />
            <CardContent className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                  <svg className={`h-5 w-5 ${stat.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p className={`mt-3 text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Incident Trends</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-surface-secondary p-0.5 ring-1 ring-border-light">
                  {(["monthly", "yearly"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChartMode(m)}
                      className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        chartMode === m
                          ? "bg-surface-elevated text-primary"
                          : "text-text-secondary hover:text-text"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <Button variant="secondary" size="sm" onClick={handleDownloadPdf} loading={downloading}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-text-secondary">No incident data yet.</p>
            ) : (
              <YearlyTrendChart data={chartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-sm text-text-secondary">No incidents reported yet.</p>
            ) : (
              <IncidentPieChart attempted={attemptedCount} positive={positiveCount} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
