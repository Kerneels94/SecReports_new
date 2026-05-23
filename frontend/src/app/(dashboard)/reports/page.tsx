"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { reportService } from "@/services";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  assigned: "Assigned",
  investigating: "Investigating",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

const severityColors: Record<string, "default" | "warning" | "danger" | "info"> = {
  low: "default",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

export default function ReportsPage() {
  const [data, setData] = useState<{
    total: number;
    byStatus: { status: string; _count: { id: number } }[];
    bySeverity: { severity: string; _count: { id: number } }[];
    recent: { id: number; title: string; severity: string; status: string; createdAt: string; reporter?: { name: string } }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.summary();
      setData(res.data);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Reports</h1>
        <p className="text-sm text-text-secondary mt-1">Incident summary and statistics</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardContent className="relative">
            <p className="text-sm text-text-secondary">Total Incidents</p>
            <p className="mt-2 text-3xl font-bold text-text">{data.total}</p>
          </CardContent>
        </Card>
        {data.bySeverity.map((s) => (
          <Card key={s.severity} className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.severity === "critical" || s.severity === "high" ? "from-red-500/10" : s.severity === "medium" ? "from-amber-500/10" : "from-primary/5"} to-transparent`} />
            <CardContent className="relative">
              <p className="text-sm text-text-secondary capitalize">{s.severity}</p>
              <p className={`mt-2 text-3xl font-bold ${s.severity === "critical" || s.severity === "high" ? "text-danger" : s.severity === "medium" ? "text-warning" : "text-text"}`}>
                {s._count.id}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byStatus.length === 0 ? (
              <p className="text-sm text-text-secondary">No data available.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary capitalize">{statusLabels[s.status] || s.status.replace("_", " ")}</span>
                            <span className="text-sm font-semibold text-text">{s._count.id}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="text-sm text-text-secondary">No incidents reported yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recent.map((inc) => (
                  <div key={inc.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{inc.title}</p>
                      <p className="text-xs text-text-secondary">{inc.reporter?.name} &middot; {new Date(inc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <Badge variant={severityColors[inc.severity] || "default"} dot>{inc.severity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
