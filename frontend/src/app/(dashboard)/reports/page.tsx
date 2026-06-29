"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import { EmailReportModal } from "@/components/incidents/EmailReportModal";
import { reportService, incidentService, exportService } from "@/services";
import type { Incident } from "@/types";

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

export default function ReportsPage() {
  const [summary, setSummary] = useState<{
    total: number;
    byStatus: { status: string; _count: { id: number } }[];
    recent: Incident[];
    attemptedCount: number;
    positiveCount: number;
  } | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [emailIncident, setEmailIncident] = useState<{ id: number; title: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, incidentsRes] = await Promise.all([
        reportService.summary(),
        incidentService.list({ page: String(page), perPage: String(perPage) }),
      ]);
      setSummary(summaryRes.data);
      setIncidents(incidentsRes.data.data);
      setTotal(incidentsRes.data.total);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadPdf = async (incidentId: number) => {
    setDownloadingId(incidentId);
    try {
      const blob = await exportService.downloadPdf(incidentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident-${incidentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);

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
        <Button variant="secondary" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  if (!summary) return null;

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
            <p className="mt-2 text-3xl font-bold text-text">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
          <CardContent className="relative">
            <p className="text-sm text-text-secondary">Attempted</p>
            <p className="mt-2 text-3xl font-bold text-warning">{summary.attemptedCount}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <CardContent className="relative">
            <p className="text-sm text-text-secondary">Positive</p>
            <p className="mt-2 text-3xl font-bold text-success">{summary.positiveCount}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
          <CardContent className="relative">
            <p className="text-sm text-text-secondary">Statuses</p>
            <p className="mt-2 text-3xl font-bold text-text">{summary.byStatus.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.byStatus.length === 0 ? (
              <p className="text-sm text-text-secondary">No data available.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {summary.byStatus.map((s) => (
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
            <CardTitle>By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Attempted</span>
                <span className="text-sm font-semibold text-warning">{summary.attemptedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Positive</span>
                <span className="text-sm font-semibold text-success">{summary.positiveCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Other</span>
                <span className="text-sm font-semibold text-text">{summary.total - summary.attemptedCount - summary.positiveCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>All Incidents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <p className="text-sm text-text-secondary">No incidents found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Ref #</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Reporter</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-right font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident, idx) => (
                    <tr key={incident.id} className={`border-b border-border-light/50 hover:bg-surface-elevated/30 transition-colors ${idx % 2 === 0 ? 'bg-surface-elevated/20' : ''}`}>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedIncidentId(incident.id)}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {incident.referenceNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedIncidentId(incident.id)}
                          className="font-medium text-text hover:text-primary transition-colors text-left"
                        >
                          {incident.title}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{incident.type}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-text-secondary capitalize">
                          {statusLabels[incident.status] || incident.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{incident.reporter?.name || "-"}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedIncidentId(incident.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
                            title="View"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(incident.id)}
                            disabled={downloadingId === incident.id}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailIncident({ id: incident.id, title: incident.title })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
                            title="Email"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selectedIncidentId && (
        <IncidentDetailModal
          incidentId={selectedIncidentId}
          open={!!selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}

      {emailIncident && (
        <EmailReportModal
          incidentId={emailIncident.id}
          incidentTitle={emailIncident.title}
          open={!!emailIncident}
          onClose={() => setEmailIncident(null)}
        />
      )}
    </div>
  );
}
