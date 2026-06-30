"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import { reportService, incidentService } from "@/services";
import { DashboardSearch } from "./components/DashboardSearch";
import { useAuth } from "@/hooks/useAuth";
import type { Incident, TrialStatus } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [positiveCount, setPositiveCount] = useState(0);
  const [recent, setRecent] = useState<Incident[]>([]);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tableLoading, setTableLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.summary();
      setTotal(res.data.total);
      setAttemptedCount(res.data.attemptedCount);
      setPositiveCount(res.data.positiveCount);
      setRecent(res.data.recent);
      setTrial(res.data.trial);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const fetchFiltered = useCallback(async (from: string, to: string, type: string) => {
    setTableLoading(true);
    try {
      const params: Record<string, string> = { page: "1", perPage: "50" };
      if (from) params.dateFrom = from;
      if (to) params.dateTo = to;
      if (type) params.type = type;
      const res = await incidentService.list(params);
      setRecent(res.data.data);
    } catch {
    } finally {
      setTableLoading(false);
    }
  }, []);

  const handleDateFromChange = (v: string) => {
    setDateFrom(v);
    if (v || dateTo || typeFilter) {
      fetchFiltered(v, dateTo, typeFilter);
    } else {
      fetchSummary();
    }
  };

  const handleDateToChange = (v: string) => {
    setDateTo(v);
    if (dateFrom || v || typeFilter) {
      fetchFiltered(dateFrom, v, typeFilter);
    } else {
      fetchSummary();
    }
  };

  const handleTypeFilterChange = (v: string) => {
    setTypeFilter(v);
    if (dateFrom || dateTo || v) {
      fetchFiltered(dateFrom, dateTo, v);
    } else {
      fetchSummary();
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
    { label: "Incidents", value: total, color: "text-primary", gradient: "from-primary/10 to-primary/5", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
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

      <DashboardSearch
        dateFrom={dateFrom}
        dateTo={dateTo}
        typeFilter={typeFilter}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onTypeFilterChange={handleTypeFilterChange}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {tableLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-text-secondary">No incidents reported yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-4 text-left font-medium text-text-secondary">Ref #</th>
                      <th className="pb-2 pr-4 text-left font-medium text-text-secondary">Title</th>
                      <th className="pb-2 pr-4 text-left font-medium text-text-secondary">Created by</th>
                      <th className="pb-2 pr-4 text-left font-medium text-text-secondary">Dispatcher</th>
                      <th className="pb-2 text-left font-medium text-text-secondary">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((incident) => (
                      <tr key={incident.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() => setSelectedIncidentId(incident.id)}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {incident.referenceNumber}
                          </button>
                        </td>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() => setSelectedIncidentId(incident.id)}
                            className="font-medium text-text hover:underline text-left"
                          >
                            {incident.title}
                          </button>
                        </td>
                        <td className="py-3 pr-4 text-sm text-text-secondary">
                          {incident.operatorName}
                        </td>
                        <td className="py-3 pr-4 text-sm text-text-secondary">
                          {incident.dispatcher}
                        </td>
                        <td className="py-3 text-sm text-text-secondary">
                          {new Date(incident.incidentDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
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

      {selectedIncidentId && (
        <IncidentDetailModal
          incidentId={selectedIncidentId}
          open={!!selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}
    </div>
  );
}
