"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MonthlyCrimeReportModal } from "@/components/reports/MonthlyCrimeReportModal";
import { reportService, exportService, formatDurationMs } from "@/services";
import {
  IncidentPieChart,
  ResponseTimeChart,
  YearlyTrendChart,
} from "./components/DashboardCharts";
import type {
  AreaResponseStat,
  MonthlyResponseStat,
  ResponsePeriod,
  SiteIncidentStat,
} from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { TrialStatus } from "@/types";

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

/** Short month label for a "YYYY-MM" key, falling back to the raw key. */
const shortMonth = (key: string) => {
  const m = Number(key.slice(5, 7));
  return monthNames[m - 1] ?? key;
};

/** "2026-04" -> "Apr 2026"; anything else passes through. */
const longMonth = (key: string) => {
  const [year, m] = key.split("-");
  return monthNames[Number(m) - 1]
    ? `${monthNames[Number(m) - 1]} ${year}`
    : key;
};

/** Compact range for the stat note: "Apr – Oct 2026" or "Nov 2025 – Feb 2026". */
const monthRange = (data: { month: string }[]) => {
  if (data.length === 0) return "";
  const first = data[0].month;
  const last = data[data.length - 1].month;
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  const start = sameYear ? shortMonth(first) : longMonth(first);
  return `${start} – ${longMonth(last)}`;
};

/** Collapsible "View as table" fallback for a chart. */
function ChartTable({
  head,
  rows,
}: {
  head: [string, string];
  rows: [string, string | number][];
}) {
  const cell = "border-t border-border px-2 py-1.5 text-left font-normal";
  return (
    <details className="mt-3 text-[13px] text-text-secondary">
      <summary className="w-max cursor-pointer text-text-secondary/80 hover:text-text">
        View as table
      </summary>
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr>
            <th className={cell}>{head[0]}</th>
            <th className={cell}>{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className={cell}>{label}</td>
              <td className={cell}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const ICONS = {
  calendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  file: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  alert:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  octagon: "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z",
};

const PANEL = "rounded-[18px] border border-border-light bg-surface p-[22px]";
const CARD_HEAD = "mb-4 flex flex-wrap items-start justify-between gap-3";
const CARD_TITLE = "text-base font-semibold tracking-tight text-text";
const CARD_SUB = "mt-0.5 text-[13px] text-text-secondary/80";

const TONE = {
  accent: {
    box: "bg-primary/10 text-primary border-primary/25",
  },
  amber: {
    box: "bg-amber-600/15 text-amber-300 border-amber-600/40",
  },
  rose: {
    box: "bg-rose-600/15 text-rose-300 border-rose-600/40",
  },
} as const;

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
  const [sitesData, setSitesData] = useState<SiteIncidentStat[]>([]);
  const [areaPage, setAreaPage] = useState(1);
  const [chartMode, setChartMode] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseError, setResponseError] = useState(false);
  const [responseLoading, setResponseLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingSites, setDownloadingSites] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [downloadingPeriod, setDownloadingPeriod] =
    useState<ResponsePeriod | null>(null);
  // Download failures are reported next to the buttons, not via `error`: that one replaces the
  // whole dashboard with a Retry button, so a 404 or expired trial would blank every chart.
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [yearlyError, setYearlyError] = useState<string | null>(null);
  const [sitesError, setSitesError] = useState<string | null>(null);

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
      const [responseRes, areaRes, sitesRes] = await Promise.all([
        reportService.monthlyResponse(),
        reportService.responseByArea(),
        reportService.topSites(),
      ]);
      setResponseData(responseRes.data);
      setAreaData(areaRes.data ?? []);
      setSitesData(sitesRes.data ?? []);
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
      prevLabel: prev ? longMonth(prev.month) : null,
      count: last.count,
      delta: prev ? last.count - prev.count : null,
    };
  }, [monthlyData]);

  const responseStats = useMemo(() => {
    if (responseData.length === 0) return null;
    const avg =
      responseData.reduce((sum, d) => sum + d.avgMs, 0) / responseData.length;
    const fastest = responseData.reduce((a, b) => (b.avgMs < a.avgMs ? b : a));
    const slowest = responseData.reduce((a, b) => (b.avgMs > a.avgMs ? b : a));
    return { avg, fastest, slowest };
  }, [responseData]);

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
      saveBlob(
        await exportService.downloadYearlyPdf(),
        "yearly-crime-stats.pdf",
      );
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
      setDownloadError(
        `Failed to download ${months}-month response time report`,
      );
    } finally {
      setDownloadingPeriod(null);
    }
  };

  const handleDownloadSites = async () => {
    setDownloadingSites(true);
    setSitesError(null);
    try {
      saveBlob(
        await exportService.downloadTopSitesPdf(),
        "sites-with-most-incidents.pdf",
      );
    } catch {
      setSitesError("Failed to download the site report");
    } finally {
      setDownloadingSites(false);
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

  const attemptedPct = total ? Math.round((attemptedCount / total) * 100) : 0;
  const positivePct = total ? Math.round((positiveCount / total) * 100) : 0;

  const statCards: {
    key: string;
    label: string;
    value: number;
    tone: keyof typeof TONE;
    icon: string;
    note: React.ReactNode;
  }[] = [];

  if (latestMonth) {
    statCards.push({
      key: "latest",
      label: `${latestMonth.label} incidents`,
      value: latestMonth.count,
      tone: "accent",
      icon: ICONS.calendar,
      note:
        latestMonth.delta === null ? (
          "No previous month"
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 ${latestMonth.delta > 0 ? "text-rose-300" : "text-primary"}`}
          >
            <svg
              className="h-[15px] w-[15px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m22 17-8.5-8.5-5 5L2 7" />
              <path d="M16 17h6v-6" />
            </svg>
            {Math.abs(latestMonth.delta)}{" "}
            {latestMonth.delta >= 0 ? "more" : "fewer"} than{" "}
            {latestMonth.prevLabel}
          </span>
        ),
    });
  }

  statCards.push(
    {
      key: "total",
      label: "Total incidents",
      value: total,
      tone: "accent",
      icon: ICONS.file,
      note: monthRange(monthlyData),
    },
    {
      key: "attempted",
      label: "Attempted",
      value: attemptedCount,
      tone: "amber",
      icon: ICONS.alert,
      note: `${attemptedPct}% of all incidents`,
    },
    {
      key: "positive",
      label: "Positive",
      value: positiveCount,
      tone: "rose",
      icon: ICONS.octagon,
      note: `${positivePct}% of all incidents`,
    },
  );

  return (
    <div className="relative isolate">
      <div className="relative z-10 flex flex-col gap-6">
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
              <Link
                href="/settings/billing"
                className="cursor-pointer underline font-medium hover:text-amber-100"
              >
                Upgrade now
              </Link>{" "}
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
              <Link
                href="/settings/billing"
                className="cursor-pointer underline font-medium hover:text-red-100"
              >
                Upgrade now
              </Link>{" "}
              to restore full access.
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-text">
              Dashboard
            </h1>
            <p className="mt-1 text-text-secondary">
              Overview of incident reports
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canExportReports && (
              <>
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
                  Yearly Crime Stat report
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadSites}
                  loading={downloadingSites}
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
                  Sites report
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMonthlyOpen(true)}
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
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Monthly Crime Stat report
                </Button>
              </>
            )}
          </div>
        </div>

        {yearlyError && (
          <p role="alert" className="text-lg text-danger">
            {yearlyError}
          </p>
        )}

        {sitesError && (
          <p role="alert" className="text-lg text-danger">
            {sitesError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.key} className={PANEL}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-text-secondary">
                  {stat.label}
                </p>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-[10px] border ${TONE[stat.tone].box}`}
                >
                  <svg
                    className="h-[18px] w-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={stat.icon} />
                  </svg>
                </span>
              </div>
              <p className="mt-4 font-mono text-4xl font-semibold leading-none tracking-tight text-text">
                {stat.value}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-text-secondary">
                {stat.note}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
          <div className={`${PANEL} lg:col-span-4`}>
            <div data-testid="trend-header" className={CARD_HEAD}>
              <div>
                <h2 className={CARD_TITLE}>Incident trends</h2>
                <p className={CARD_SUB}>Incidents per month</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-border-light bg-surface-secondary p-0.5">
                  {(["monthly", "yearly"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChartMode(m)}
                      className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                        chartMode === m
                          ? "bg-primary text-gray-900"
                          : "text-text-secondary hover:text-text"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {monthlyData.length === 0 ? (
              <p className="text-lg text-text-secondary">
                No incident data yet.
              </p>
            ) : (
              <>
                <YearlyTrendChart data={chartData} />
                <ChartTable
                  head={["Month", "Incidents"]}
                  rows={chartData.map((d) => [
                    chartMode === "yearly" ? d.month : longMonth(d.month),
                    d.count,
                  ])}
                />
              </>
            )}
          </div>

          <div className={`${PANEL} flex flex-col lg:col-span-2`}>
            <div className={CARD_HEAD}>
              <div>
                <h2 className={CARD_TITLE}>Incidents by Type</h2>
                <p className={CARD_SUB}>All incidents</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center">
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
            </div>
          </div>

          <div className={`${PANEL} flex flex-col lg:col-span-3`}>
            <div className={CARD_HEAD}>
              <div>
                <h2 className={CARD_TITLE}>Average response time</h2>
                <p className={CARD_SUB}>Dispatch to arrival, per month</p>
              </div>
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
            <div className="flex-1 min-h-0">
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
                  No response time data yet (dispatch/arrival times not
                  recorded).
                </p>
              ) : (
                <>
                  <ResponseTimeChart data={responseData} />
                  <ChartTable
                    head={["Month", "Average response"]}
                    rows={responseData.map((d) => [
                      longMonth(d.month),
                      formatDurationMs(d.avgMs),
                    ])}
                  />
                </>
              )}
            </div>
            {!responseLoading && !responseError && responseStats && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { v: responseStats.avg, l: "7-month average" },
                  {
                    v: responseStats.fastest.avgMs,
                    l: `Fastest · ${shortMonth(responseStats.fastest.month)}`,
                  },
                  {
                    v: responseStats.slowest.avgMs,
                    l: `Slowest · ${shortMonth(responseStats.slowest.month)}`,
                  },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-lg border border-border-light bg-surface-secondary px-3 py-2.5"
                  >
                    <b className="block font-mono text-lg font-semibold text-text">
                      {formatDurationMs(s.v)}
                    </b>
                    <span className="text-[11px] text-text-secondary">
                      {s.l}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${PANEL} flex flex-col lg:col-span-3`}>
            <div className={CARD_HEAD}>
              <div>
                <h2 className={CARD_TITLE}>Response time by area</h2>
                <p className={CARD_SUB}>Slowest areas first</p>
              </div>
            </div>
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
                <div className="grid">
                  <div
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(48px,1fr)_72px_34px] items-center gap-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-text-secondary/70"
                    aria-hidden="true"
                  >
                    <span>Area</span>
                    <span />
                    <span className="text-right">Average</span>
                    <span className="text-right">Inc.</span>
                  </div>
                  {areaPageRows.map((area) => (
                    <div
                      key={area.area}
                      className="grid grid-cols-[minmax(0,1.2fr)_minmax(48px,1fr)_72px_34px] items-center gap-3 border-t border-border py-2.5"
                    >
                      <span className="truncate text-sm text-text-secondary">
                        {area.area}
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{
                            width: `${(area.avgMs / maxAreaAvgMs) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="text-right font-mono text-[13px] font-medium text-text">
                        {formatDurationMs(area.avgMs)}
                      </span>
                      <span className="text-right text-[13px] text-text-secondary">
                        {area.count}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3.5 text-[13px] text-text-secondary">
                  <span>
                    Page {areaPage} of {areaTotalPages}
                  </span>
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
              </div>
            )}
          </div>

          <div className={`${PANEL} flex flex-col lg:col-span-6`}>
            <div className={CARD_HEAD}>
              <div>
                <h2 className={CARD_TITLE}>Sites with most incidents</h2>
                <p className={CARD_SUB}>Top 10 by incident count</p>
              </div>
            </div>
            {responseLoading ? (
              <>
                <p className="sr-only" role="status">
                  Loading site data
                </p>
                <div className="flex flex-col gap-3" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-5 animate-pulse rounded bg-zinc-600"
                    />
                  ))}
                </div>
              </>
            ) : responseError ? (
              <p className="text-lg text-danger">Failed to load site data</p>
            ) : sitesData.length === 0 ? (
              <p className="text-lg text-text-secondary">No site data yet.</p>
            ) : (
              <div className="flex flex-col">
                {sitesData.map((s) => (
                  <div
                    key={s.site}
                    className="flex items-center justify-between gap-4 border-t border-border py-2.5"
                  >
                    <span
                      className="truncate text-sm text-text-secondary"
                      title={s.site}
                    >
                      {s.site}
                    </span>
                    <span className="shrink-0 font-mono text-[13px] font-medium text-text">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <MonthlyCrimeReportModal
        open={monthlyOpen}
        onClose={() => setMonthlyOpen(false)}
        onDownloaded={(blob) => saveBlob(blob, "monthly-crime-stats.pdf")}
      />
    </div>
  );
}
