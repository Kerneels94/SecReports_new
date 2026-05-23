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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={fetchSummary}
          className="rounded-lg bg-surface-secondary px-4 py-2 text-sm font-medium text-text hover:bg-border transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">Overview of incident reports</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Open Incidents</p>
            <p className="mt-2 text-3xl font-bold text-warning">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Critical</p>
            <p className="mt-2 text-3xl font-bold text-danger">{criticalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Assigned to Me</p>
            <p className="mt-2 text-3xl font-bold text-primary">{assignedToMe}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Overdue Actions</p>
            <p className="mt-2 text-3xl font-bold text-danger">{overdueActions}</p>
          </CardContent>
        </Card>
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
