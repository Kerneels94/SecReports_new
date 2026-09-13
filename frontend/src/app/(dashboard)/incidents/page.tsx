/**
 * Incidents page — summary stats, paginated table with action buttons, detail modal, email, and batch send.
 * @route /incidents
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import { EmailReportModal } from "@/components/incidents/EmailReportModal";
import { incidentService, reportService, exportService } from "@/services";
import { incidentReportFileName } from "@/lib/reportName";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Incident } from "@/types";

export default function IncidentsPage() {
  const { user } = useAuth();
  const canViewReports = hasPermission(user, "reports.view");
  const canExportPdf = hasPermission(user, "export.csv");
  const canEmail = hasPermission(user, "reports.view");
  const [summary, setSummary] = useState<{
    total: number;
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [batchType, setBatchType] = useState<"attempted" | "positive" | null>(null);
  const [batchEmail, setBatchEmail] = useState("");
  const [batchFormat, setBatchFormat] = useState<"csv" | "pdf">("pdf");
  const [batchSending, setBatchSending] = useState(false);
  const [batchSent, setBatchSent] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const perPage = 25;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), perPage: String(perPage) };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (typeFilter) params.type = typeFilter;

      const summaryTask = canViewReports ? reportService.summary() : Promise.resolve(null);
      const [summaryRes, incidentsRes] = await Promise.all([
        summaryTask,
        incidentService.list(params),
      ]);
      if (summaryRes) {
        setSummary({
          total: summaryRes.data.total,
          attemptedCount: summaryRes.data.attemptedCount,
          positiveCount: summaryRes.data.positiveCount,
        });
      }
      setIncidents(incidentsRes.data.data);
      setTotal(incidentsRes.data.total);
    } catch {
      setError("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, typeFilter, canViewReports]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadPdf = async (incident: Incident) => {
    setDownloadingId(incident.id);
    try {
      const blob = await exportService.downloadPdf(incident.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = incidentReportFileName(incident);
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

  const handleBatchSend = async () => {
    if (!batchEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(batchEmail)) {
      setBatchError("Please enter a valid email address");
      return;
    }
    setBatchSending(true);
    setBatchError(null);
    try {
      await reportService.batchEmail(batchEmail, batchType!, batchFormat);
      setBatchSent(true);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Failed to send email. Please try again.");
    } finally {
      setBatchSending(false);
    }
  };

  const openBatchModal = (type: "attempted" | "positive") => {
    setBatchType(type);
    setBatchEmail("");
    setBatchFormat("pdf");
    setBatchSent(false);
    setBatchError(null);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Incidents</h1>
          <p className="text-sm text-text-secondary mt-1">{total} total incidents</p>
        </div>
        <Link href="/incidents/new">
          <Button>Report Incident</Button>
        </Link>
      </div>

      {canViewReports && summary && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
              {summary.attemptedCount > 0 && (
                <button
                  type="button"
                  onClick={() => openBatchModal("attempted")}
                  className="mt-3 text-xs font-medium text-primary hover:underline"
                >
                  Email All
                </button>
              )}
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
            <CardContent className="relative">
              <p className="text-sm text-text-secondary">Positive</p>
              <p className="mt-2 text-3xl font-bold text-success">{summary.positiveCount}</p>
              {summary.positiveCount > 0 && (
                <button
                  type="button"
                  onClick={() => openBatchModal("positive")}
                  className="mt-3 text-xs font-medium text-primary hover:underline"
                >
                  Email All
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-date-from" className="text-xs font-medium text-text-secondary">Date From</label>
          <input
            id="filter-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-date-to" className="text-xs font-medium text-text-secondary">Date To</label>
          <input
            id="filter-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-type" className="text-xs font-medium text-text-secondary">Type</label>
          <select
            id="filter-type"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
          >
            <option value="">All Types</option>
            <option value="attempted">Attempted</option>
            <option value="positive">Positive</option>
          </select>
        </div>
        {(dateFrom || dateTo || typeFilter) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setDateFrom(""); setDateTo(""); setTypeFilter(""); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-text-secondary">Loading incidents...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-sm text-danger">{error}</p>
              <Button variant="secondary" onClick={fetchData}>Retry</Button>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated/60 ring-1 ring-border-light">
                <svg className="h-6 w-6 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-text-secondary">No incidents found.</p>
              <Link href="/incidents/new">
                <Button variant="gradient">Report your first incident</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Ref #</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Type</th>
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
                          {canExportPdf && (
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(incident)}
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
                          )}
                          {canEmail && (
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
                          )}
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

      <Modal
        open={!!batchType}
        onClose={() => setBatchType(null)}
        title={`Email All ${batchType ? batchType.charAt(0).toUpperCase() + batchType.slice(1) : ""} Incidents`}
        className="max-w-md w-full"
      >
        {batchSent ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <svg className="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm text-text text-center">
              Report for all {batchType} incidents sent to <span className="font-semibold">{batchEmail}</span>
            </p>
            <Button variant="secondary" size="sm" onClick={() => setBatchType(null)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Send all <span className="font-semibold text-text">{batchType}</span> incidents as an email attachment.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Email address</label>
              <input
                type="email"
                value={batchEmail}
                onChange={(e) => { setBatchEmail(e.target.value); setBatchError(null); }}
                placeholder="recipient@example.com"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Format</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBatchFormat("pdf")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${batchFormat === "pdf" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setBatchFormat("csv")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${batchFormat === "csv" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
                >
                  CSV
                </button>
              </div>
            </div>

            {batchError && (
              <p className="text-xs text-danger">{batchError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setBatchType(null)}>Cancel</Button>
              <Button size="sm" onClick={handleBatchSend} disabled={batchSending}>
                {batchSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
