/**
 * Incidents page — summary stats, paginated table with action buttons, detail modal, email, and batch send.
 * @route /incidents
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import { EmailReportModal } from "@/components/incidents/EmailReportModal";
import { incidentService, reportService, exportService } from "@/services";
import { incidentReportFileName } from "@/lib/reportName";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Incident } from "@/types";

const PANEL = "rounded-[18px] border border-border-light bg-surface";
const TH =
  "px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.09em] text-text-secondary/70 whitespace-nowrap";
const TD = "px-4 py-3.5 text-sm align-middle";

const ICONS = {
  file: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  alert:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  octagon: "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
};

/** UTC dd/mm/yyyy, matching the design. Incident dates are stored as UTC midnight. */
const formatIncidentDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
};

/** Pill colour for an incident type. */
const typeChip = (type: string) => {
  const t = type.toLowerCase();
  if (t === "attempted")
    return "bg-amber-300/10 text-amber-300 border border-amber-300/20";
  if (t === "positive")
    return "bg-red-300/10 text-red-300 border border-red-300/25";
  return "bg-surface-elevated text-text-secondary border border-zinc-500";
};

export default function IncidentsPage() {
  const { user } = useAuth();
  const canViewReports = hasPermission(user, "reports.view");
  const canCreate = hasPermission(user, "incidents.create");
  const canExportPdf = hasPermission(user, "export.csv");
  const canEmail = hasPermission(user, "export.reports");
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
  // Separate from `error`, which replaces the whole table with a Retry button.
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [batchType, setBatchType] = useState<"attempted" | "positive" | null>(null);
  const [batchEmail, setBatchEmail] = useState("");
  const [batchFormat, setBatchFormat] = useState<"csv" | "pdf">("pdf");
  const [batchSending, setBatchSending] = useState(false);
  const [batchSent, setBatchSent] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const perPage = 10;

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), perPage: String(perPage) };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;

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
  }, [page, dateFrom, dateTo, typeFilter, search, canViewReports]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadPdf = async (incident: Incident) => {
    setDownloadingId(incident.id);
    setDownloadError(null);
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
      setDownloadError("Failed to download PDF");
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-text">Incidents</h1>
          <p className="mt-1 text-text-secondary">{total} total incidents</p>
        </div>
        {canCreate && (
          <Link
            href="/incidents/new"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-hover px-3.5 text-sm font-medium text-gray-900 shadow-[0_10px_30px_-12px_rgba(134,239,172,0.55)] transition-all duration-150 hover:brightness-105"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Report incident
          </Link>
        )}
      </div>

      {canViewReports && summary && (
        <div className="grid grid-cols-3 gap-3">
          <article className={`${PANEL} flex flex-col p-4`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text-secondary">Total incidents</p>
              <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-primary/25 bg-primary/10 text-primary">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS.file} />
                </svg>
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold leading-none tracking-tight text-text">
              {summary.total}
            </p>
          </article>

          <article className={`${PANEL} flex flex-col p-4`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text-secondary">Attempted</p>
              <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-amber-600/40 bg-amber-600/15 text-amber-300">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS.alert} />
                </svg>
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold leading-none tracking-tight text-text">
              {summary.attemptedCount}
            </p>
            {summary.attemptedCount > 0 && (
              <button
                type="button"
                onClick={() => openBatchModal("attempted")}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-border-light hover:bg-surface-elevated"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS.mail} />
                </svg>
                Email all
              </button>
            )}
          </article>

          <article className={`${PANEL} flex flex-col p-4`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text-secondary">Positive</p>
              <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-rose-600/40 bg-rose-600/15 text-rose-300">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS.octagon} />
                </svg>
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold leading-none tracking-tight text-text">
              {summary.positiveCount}
            </p>
            {summary.positiveCount > 0 && (
              <button
                type="button"
                onClick={() => openBatchModal("positive")}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-border-light hover:bg-surface-elevated"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS.mail} />
                </svg>
                Email all
              </button>
            )}
          </article>
        </div>
      )}

      <div className={`${PANEL} flex flex-wrap items-end gap-3 px-5 py-[18px]`}>
        <div className="min-w-[220px] flex-1">
          <label htmlFor="filter-search" className="mb-1.5 block text-[13px] font-medium text-text-secondary">Search</label>
          <input
            id="filter-search"
            type="search"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            placeholder="Address, reporter, title or reference"
            className="h-10 w-full rounded-[9px] border border-border bg-surface-secondary px-3 text-sm text-text outline-none transition-colors placeholder:text-text-secondary/60 focus:border-primary"
          />
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="filter-date-from" className="mb-1.5 block text-[13px] font-medium text-text-secondary">Date from</label>
          <input
            id="filter-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="h-10 rounded-[9px] border border-border bg-surface-secondary px-3 text-sm text-text outline-none transition-colors focus:border-primary"
          />
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="filter-date-to" className="mb-1.5 block text-[13px] font-medium text-text-secondary">Date to</label>
          <input
            id="filter-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="h-10 rounded-[9px] border border-border bg-surface-secondary px-3 text-sm text-text outline-none transition-colors focus:border-primary"
          />
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="filter-type" className="mb-1.5 block text-[13px] font-medium text-text-secondary">Type</label>
          <select
            id="filter-type"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-[9px] border border-border bg-surface-secondary px-3 text-sm text-text outline-none transition-colors focus:border-primary"
          >
            <option value="">All types</option>
            <option value="attempted">Attempted</option>
            <option value="positive">Positive</option>
          </select>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-10"
          onClick={() => { setSearchInput(""); setSearch(""); setDateFrom(""); setDateTo(""); setTypeFilter(""); setPage(1); }}
        >
          Clear
        </Button>
      </div>

      {downloadError && (
        <p role="alert" className="text-sm text-danger">
          {downloadError}
        </p>
      )}

      <div className={`${PANEL} overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
                <p className="text-lg text-text-secondary">Loading incidents...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-lg text-danger">{error}</p>
              <Button variant="secondary" onClick={fetchData}>Retry</Button>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated/60 ring-1 ring-border-light">
                <svg className="h-6 w-6 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg text-text-secondary">No incidents found.</p>
              {/* Same gate as the header link: without incidents.create the
                  backend rejects the submission, so don't offer it. */}
              {canCreate && (
                <Link href="/incidents/new" className="cursor-pointer">
                  <Button variant="gradient">Report your first incident</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-secondary/45">
                      <th className={TH}>Reference</th>
                      <th className={TH}>Address</th>
                      <th className={TH}>Type</th>
                      {/* Column shows operatorName, so label it Operator (was "Reporter"). */}
                      <th className={`${TH} hidden md:table-cell`}>Operator</th>
                      <th className={TH}>Date</th>
                      <th className={TH}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => (
                      <tr
                        key={incident.id}
                        className="transition-colors hover:bg-surface-elevated/20 [&:last-child>td]:border-b-0"
                      >
                        <td className={`${TD} border-b border-border`}>
                          <button
                            type="button"
                            onClick={() => setSelectedIncidentId(incident.id)}
                            className="cursor-pointer font-mono text-[13px] text-primary hover:underline"
                          >
                            {incident.referenceNumber}
                          </button>
                        </td>
                        <td className={`${TD} border-b border-border`}>
                          <button
                            type="button"
                            onClick={() => setSelectedIncidentId(incident.id)}
                            className="cursor-pointer text-left font-medium text-text transition-colors hover:text-primary"
                          >
                            {incident.propertyAddress || incident.location || incident.businessOrComplex || "-"}
                          </button>
                          {(incident.suburb || incident.city) && (
                            <small className="mt-0.5 block text-xs font-normal text-text-secondary/80">
                              {[incident.suburb, incident.city].filter(Boolean).join(", ")}
                            </small>
                          )}
                        </td>
                        <td className={`${TD} border-b border-border`}>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-xs font-semibold capitalize ${typeChip(incident.type)}`}
                          >
                            {incident.type}
                          </span>
                        </td>
                        <td className={`${TD} hidden border-b border-border text-text-secondary md:table-cell`}>
                          {incident.operatorName || "-"}
                        </td>
                        <td className={`${TD} whitespace-nowrap border-b border-border font-mono text-[13px] text-text-secondary`}>
                          {formatIncidentDate(incident.incidentDate)}
                        </td>
                        <td className={`${TD} border-b border-border`}>
                          <div className="flex justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedIncidentId(incident.id)}
                              className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text"
                              title="View"
                            >
                              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            {canExportPdf && (
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(incident)}
                                disabled={downloadingId === incident.id}
                                className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text disabled:opacity-50"
                                title="Download PDF"
                              >
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text"
                                title="Email"
                              >
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="flex items-center justify-between border-t border-border px-4 py-3.5 text-[13px] text-text-secondary">
                <span>
                  Page {page} of {Math.max(1, totalPages)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-[30px] px-2.5 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-[30px] px-2.5 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
      </div>

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
            <p className="text-lg text-text text-center">
              Report for all {batchType} incidents sent to <span className="font-semibold">{batchEmail}</span>
            </p>
            <Button variant="secondary" size="sm" onClick={() => setBatchType(null)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-lg text-text-secondary">
              Send all <span className="font-semibold text-text">{batchType}</span> incidents as an email attachment.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-lg font-medium text-text-secondary">Email address</label>
              <input
                type="email"
                value={batchEmail}
                onChange={(e) => { setBatchEmail(e.target.value); setBatchError(null); }}
                placeholder="recipient@example.com"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-lg text-text outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-lg font-medium text-text-secondary">Format</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBatchFormat("pdf")}
                  className={`cursor-pointer flex-1 rounded-lg border px-3 py-2 text-lg font-medium transition-colors ${batchFormat === "pdf" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
                >
                  PDF
                </button>
                {/* CSV email needs export.csv on the backend, same as the download. */}
                {canExportPdf && (
                  <button
                    type="button"
                    onClick={() => setBatchFormat("csv")}
                    className={`cursor-pointer flex-1 rounded-lg border px-3 py-2 text-lg font-medium transition-colors ${batchFormat === "csv" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
                  >
                    CSV
                  </button>
                )}
              </div>
            </div>

            {batchError && (
              <p className="text-lg text-danger">{batchError}</p>
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
