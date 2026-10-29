"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { reportService, exportService, formatDurationMs } from "@/services";
import {
  IncidentPieChart,
  ResponseTimeChart,
  YearlyTrendChart,
} from "./components/DashboardCharts";
import type { AreaResponseStat, MonthlyResponseStat, ResponsePeriod } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Incident, TrialStatus } from "@/types";

/** Periods the avg response time report can be downloaded over. */
const RESPONSE_PERIODS: ResponsePeriod[] = [3, 6, 9, 12];

/** Rows per page in the Response Time by Area card. */
const AREA_PAGE_SIZE = 10;

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function aggregateYearly(
  data: { month: string; count: number }[],
): { month: string; count: number }[] {
  const totals = new Array(12).fill(0);
  for (const d of data) {
    const i = Number(d.month.slice(5, 7)) - 1;
    totals[i] += d.count;
  }
  return totals.map((count, i) => ({ month: monthNames[i], count }));
}

/** monthlyStats omits months with no incidents; insert them as 0 so the chart and month-over-month delta stay contiguous. */
export function fillMonthGaps(
  data: { month: string; count: number }[],
): { month: string; count: number }[] {
  if (data.length === 0) return data;
  const monthIndex = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return y * 12 + m - 1;
  };
  const start = monthIndex(data[0].month);
  const end = monthIndex(data[data.length - 1].month);
  if (!(end >= start)) return data; // malformed or unsorted keys: leave as-is
  const counts = new Map(data.map((d) => [d.month, d.count]));
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const month = `${Math.floor((start + i) / 12)}-${String(((start + i) % 12) + 1).padStart(2, "0")}`;
    return { month, count: counts.get(month) ?? 0 };
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const canExportReports = hasPermission(user, "export.reports");
  const [total, setTotal] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [positiveCount, setPositiveCount] = useState(0);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [monthlyData, setMonthlyData] = useState<
    { month: string; count: number }[]
  >([]);
  const [responseData, setResponseData] = useState<MonthlyResponseStat[]>([]);
  const [areaData, setAreaData] = useState<AreaResponseStat[]>([]);
  const [areaPage, setAreaPage] = useState(1);
  const [chartMode, setChartMode] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseError, setResponseError] = useState(false);
  const [responseLoading, setResponseLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPeriod, setDownloadingPeriod] = useState<ResponsePeriod | null>(null);
  // Download failures are reported next to the buttons, not via `error`: that one replaces the
  // whole dashboard with a Retry button, so a 404 or expired trial would blank every chart.
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [yearlyError, setYearlyError] = useState<string | null>(null);

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
      setMonthlyData(fillMonthGaps(monthlyRes.data));
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResponseMetrics = useCallback(async () => {
    setResponseError(false);
    setResponseLoading(true);
    try {
      const [responseRes, areaRes] = await Promise.all([
        reportService.monthlyResponse(),
        reportService.responseByArea(),
      ]);
      setResponseData(responseRes.data);
      setAreaData(areaRes.data ?? []);
      setAreaPage(1);
    } catch {
      setResponseError(true);
    } finally {
      setResponseLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchResponseMetrics();
  }, [fetchSummary, fetchResponseMetrics]);

  const chartData = useMemo(() => {
    return chartMode === "yearly" ? aggregateYearly(monthlyData) : monthlyData;
  }, [monthlyData, chartMode]);

  const areaTotalPages = Math.max(
    1,
    Math.ceil(areaData.length / AREA_PAGE_SIZE),
  );
  const areaPageRows = areaData.slice(
    (areaPage - 1) * AREA_PAGE_SIZE,
    areaPage * AREA_PAGE_SIZE,
  );
  const maxAreaAvgMs = areaData[0]?.avgMs || 1;

  const latestMonth = useMemo(() => {
    const last = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    if (!last) return null;
    const [y, m] = last.month.split("-");
    return {
      label: `${monthNames[Number(m) - 1]} ${y}`,
      count: last.count,
      delta: prev ? last.count - prev.count : null,
    };
  }, [monthlyData]);

  const saveBlob = (blob: Blob & { filename?: string }, fallback: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = blob.filename || fallback;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setYearlyError(null);
    try {
      saveBlob(await exportService.downloadYearlyPdf(), "yearly-crime-stats.pdf");
    } catch {
      setYearlyError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadResponseTime = async (months: ResponsePeriod) => {
    setDownloadingPeriod(months);
    setDownloadError(null);
    try {
      saveBlob(
        await exportService.downloadResponseTimePdf(months),
        `avg-response-time-${months}m.pdf`,
      );
    } catch {
      setDownloadError(`Failed to download ${months}-month response time report`);
    } finally {
      setDownloadingPeriod(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
          <p className="text-lg text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-lg text-danger">{error}</p>
        <button
          onClick={fetchSummary}
          className="cursor-pointer rounded-lg bg-surface px-4 py-2 text-lg font-medium text-text border border-border hover:bg-surface-elevated transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards: {
    label: string;
    value: number;
    color: string;
    gradient: string;
    icon: string;
    delta?: number | null;
  }[] = [
    {
      label: "Total incidents",
      value: total,
      color: "text-text",
      gradient: "from-primary/10 to-primary/5",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
      label: "Attempted incidents",
      value: attemptedCount,
      color: "text-warning",
      gradient: "from-amber-500/10 to-amber-500/5",
      icon: "M12 9v2m0 4h.01m21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      label: "Positive incidents",
      value: positiveCount,
      color: "text-success",
      gradient: "from-emerald-500/10 to-emerald-500/5",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];
  if (latestMonth) {
    statCards.unshift({
      label: `${latestMonth.label} incidents`,
      value: latestMonth.count,
      color: "text-primary",
      gradient: "from-sky-500/10 to-sky-500/5",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      delta: latestMonth.delta,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {trial?.isTrial && trial.daysRemaining <= 2 && !trial.isExpired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
          <svg
            className="h-5 w-5 shrink-0 text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-lg text-amber-200">
            Your free trial ends in{" "}
            <strong>
              {trial.daysRemaining} day{trial.daysRemaining === 1 ? "" : "s"}
            </strong>
            .{" "}
            <a
              href="/settings/billing"
              className="cursor-pointer underline font-medium hover:text-amber-100"
            >
              Upgrade now
            </a>{" "}
            to keep full access.
          </div>
        </div>
      )}

      {trial?.isExpired && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 flex items-center gap-3">
          <svg
            className="h-5 w-5 shrink-0 text-danger"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-lg text-red-200">
            Your free trial has ended. Some features may be limited.{" "}
            <a
              href="/settings/billing"
              className="cursor-pointer underline font-medium hover:text-red-100"
            >
              Upgrade now
            </a>{" "}
            to restore full access.
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-lg text-text-secondary mt-1">
            Overview of incident reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${stat.gradient}`}
            />
            <CardContent className="relative">
              <div className="flex items-center justify-between">
                <p className="text-lg text-text-secondary">{stat.label}</p>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient}`}
                >
                  <svg
                    className={`h-5 w-5 ${stat.color}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p
                className={`mt-3 text-3xl font-bold tracking-tight ${stat.color}`}
              >
                {stat.value}
              </p>
              {stat.delta !== undefined && stat.delta !== null && (
                <p
                  className={`mt-1 text-lg font-medium ${stat.delta >= 0 ? "text-danger" : "text-success"}`}
                >
                  {stat.delta >= 0 ? "▲" : "▼"} {Math.abs(stat.delta)} vs
                  previous month
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Incident Trends</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-surface-secondary p-0.5 ring-1 ring-border-light">
                  {(["monthly", "yearly"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChartMode(m)}
                      className={`cursor-pointer rounded-md px-3 py-1 text-lg font-medium capitalize transition-colors ${
                        chartMode === m
                          ? "bg-surface-elevated text-primary"
                          : "text-text-secondary hover:text-text"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {canExportReports && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadPdf}
                    loading={downloading}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    PDF
                  </Button>
                )}
              </div>
            </div>
            {yearlyError && (
              <p role="alert" className="text-lg text-danger">
                {yearlyError}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-lg text-text-secondary">
                No incident data yet.
              </p>
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
              <p className="text-lg text-text-secondary">
                No incidents reported yet.
              </p>
            ) : (
              <IncidentPieChart
                attempted={attemptedCount}
                positive={positiveCount}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Avg Response Time</CardTitle>
              {canExportReports && (
                <div className="flex items-center gap-1">
                  {RESPONSE_PERIODS.map((months) => (
                    <Button
                      key={months}
                      variant="secondary"
                      size="sm"
                      className="px-2.5"
                      loading={downloadingPeriod === months}
                      aria-label={`Download ${months}-month average response time report`}
                      onClick={() => handleDownloadResponseTime(months)}
                    >
                      {months}M
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {downloadError && (
              <p role="alert" className="text-lg text-danger">
                {downloadError}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {responseLoading ? (
              <>
                <p className="sr-only" role="status">
                  Loading response time data
                </p>
                <div
                  className="h-full min-h-64 animate-pulse rounded-lg bg-zinc-600"
                  aria-hidden="true"
                />
              </>
            ) : responseError ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-lg text-danger">
                  Failed to load response time data
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchResponseMetrics}
                >
                  Retry
                </Button>
              </div>
            ) : responseData.length === 0 ? (
              <p className="text-lg text-text-secondary">
                No response time data yet (dispatch/arrival times not recorded).
              </p>
            ) : (
              <ResponseTimeChart data={responseData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time by Area</CardTitle>
          </CardHeader>
          <CardContent>
            {responseLoading ? (
              <>
                <p className="sr-only" role="status">
                  Loading area response data
                </p>
                <div
                  className="flex h-full flex-col justify-center gap-4"
                  aria-hidden="true"
                >
                  {Array.from({ length: AREA_PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-2.5">
                      <div className="h-5 w-32 shrink-0 animate-pulse rounded bg-zinc-600" />
                      <div className="h-2 min-w-0 flex-1 max-w-48 animate-pulse rounded-full bg-zinc-600" />
                      <div className="ml-auto h-5 w-20 shrink-0 animate-pulse rounded bg-zinc-600" />
                      <div className="h-5 w-28 shrink-0 animate-pulse rounded bg-zinc-600" />
                    </div>
                  ))}
                </div>
              </>
            ) : responseError ? (
              <div className="flex h-full items-center justify-center py-8">
                <p className="text-lg text-danger">
                  Failed to load response time data
                </p>
              </div>
            ) : areaData.length === 0 ? (
              <p className="text-lg text-text-secondary">
                No area response data yet.
              </p>
            ) : (
              <div className="flex h-full flex-col justify-center gap-4">
                <div className="divide-y divide-border-light/50">
                  {areaPageRows.map((area) => {
                    return (
                      <div
                        key={area.area}
                        className="flex items-center gap-4 py-2.5"
                      >
                        <span className="w-32 shrink-0 truncate text-lg text-text-secondary">
                          {area.area}
                        </span>
                        <div className="h-2 min-w-0 flex-1 max-w-48 overflow-hidden rounded-full bg-surface-secondary">
                          <div
                            className="h-full rounded-full bg-warning/80"
                            style={{
                              width: `${(area.avgMs / maxAreaAvgMs) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-4">
                          <span className="w-20 whitespace-nowrap text-right text-lg font-medium text-text">
                            {formatDurationMs(area.avgMs)}
                          </span>
                          <span className="w-28 whitespace-nowrap text-right text-lg text-text-secondary">
                            {area.count} incidents
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {areaTotalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-lg text-text-secondary">
                      Page {areaPage} of {areaTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={areaPage <= 1}
                        onClick={() => setAreaPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={areaPage >= areaTotalPages}
                        onClick={() => setAreaPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
