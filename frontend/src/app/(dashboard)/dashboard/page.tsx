"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { reportService } from "@/services";
import type { Incident } from "@/types";

const closedStatuses = new Set(["resolved", "closed", "rejected"]);

const severityColor: Record<string, string> = {
  low: "text-text-secondary",
  medium: "text-warning",
  high: "text-danger",
  critical: "text-danger",
};

export default function DashboardPage() {
  const [total, setTotal] = useState(0);
  const [byStatus, setByStatus] = useState<{ status: string; _count: { id: number } }[]>([]);
  const [bySeverity, setBySeverity] = useState<{ severity: string; _count: { id: number } }[]>([]);
  const [recent, setRecent] = useState<Incident[]>([]);
  const [assignedToMe, setAssignedToMe] = useState(0);
  const [overdueActions, setOverdueActions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.summary();
      setTotal(res.data.total);
      setByStatus(res.data.byStatus);
      setBySeverity(res.data.bySeverity);
      setRecent(res.data.recent);
      setAssignedToMe(res.data.assignedToMe);
      setOverdueActions(res.data.overdueActions);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const openCount = byStatus
    .filter((s) => !closedStatuses.has(s.status))
    .reduce((sum, s) => sum + s._count.id, 0);

  const criticalCount = bySeverity.find((s) => s.severity === "critical")?._count.id ?? 0;

  const severityTotal = bySeverity.reduce((sum, s) => sum + s._count.id, 0);

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
    { label: "Open Incidents", value: openCount, color: "text-warning", gradient: "from-amber-500/10 to-amber-500/5", icon: "M12 9v2m0 4h.01" },
    { label: "Critical", value: criticalCount, color: "text-danger", gradient: "from-red-500/10 to-red-500/5", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" },
    { label: "Assigned to Me", value: assignedToMe, color: "text-primary", gradient: "from-primary/10 to-primary/5", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { label: "Overdue Actions", value: overdueActions, color: "text-danger", gradient: "from-red-500/10 to-red-500/5", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="flex flex-col gap-8">
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient}`} />
            <CardContent className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} ring-1 ring-white/[0.06]`}>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-text-secondary">No incidents reported yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-4 text-left font-medium text-text-secondary">Ref #</th>
                      <th className="pb-2 pr-4 text-left font-medium text-text-secondary">Title</th>
                      <th className="pb-2 pr-4 text-left font-medium text-text-secondary">Severity</th>
                      <th className="pb-2 text-left font-medium text-text-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((incident) => (
                      <tr key={incident.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {incident.referenceNumber}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="font-medium text-text hover:underline"
                          >
                            {incident.title}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              incident.severity === "critical" || incident.severity === "high"
                                ? "danger"
                                : incident.severity === "medium"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {incident.severity}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              incident.status === "resolved" || incident.status === "closed"
                                ? "success"
                                : incident.status === "rejected"
                                  ? "danger"
                                  : incident.status === "under_review" || incident.status === "assigned" || incident.status === "investigating"
                                    ? "info"
                                    : incident.status === "submitted"
                                      ? "warning"
                                      : "default"
                            }
                          >
                            {incident.status.replace("_", " ")}
                          </Badge>
                        </td>
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
            <CardTitle>Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {bySeverity.length === 0 ? (
              <p className="text-sm text-text-secondary">No data available.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {bySeverity.map((s) => {
                  const pct = severityTotal > 0 ? Math.round((s._count.id / severityTotal) * 100) : 0;
                  return (
                    <div key={s.severity}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-text capitalize">{s.severity}</span>
                        <span className="text-text-secondary">{s._count.id}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-border">
                        <div
                          className={`h-2 rounded-full ${
                            s.severity === "critical"
                              ? "bg-danger"
                              : s.severity === "high"
                                ? "bg-orange-500"
                                : s.severity === "medium"
                                  ? "bg-warning"
                                  : "bg-slate-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
