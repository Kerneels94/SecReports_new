"use client";

/**
 * IncidentDetailModal - A modal that fetches and displays the full details of a single incident.
 * Shows loading, error, and detail states: a header with reference and type chips, the pinned
 * location on a Leaflet map (with a Google Maps link), and detail cards. Includes a PDF download.
 */

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LocationMap } from "@/components/map/LocationMap";
import { incidentService, exportService } from "@/services";
import { incidentReportFileName } from "@/lib/reportName";
import { googleMapsUrl } from "@/lib/geocode";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Incident } from "@/types";

const DATE_TIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-ZA", DATE_TIME);

/** A single label-value row used in the detail cards. */
function DetailRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-0 last:pb-0">
      <span className="w-28 shrink-0 text-xs text-text-subtle">{label}</span>
      <span
        className={cn(
          "min-w-0 break-words [overflow-wrap:anywhere] text-right text-sm text-text",
          mono && "font-mono text-[13px]",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** A titled card that groups related rows. */
function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] border border-border-light bg-surface-secondary/70 p-4", className)}>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-subtle">{title}</h3>
      {children}
    </section>
  );
}

/** Small pill shown in the header. */
function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "amber" | "red" | "green" }) {
  const tones = {
    neutral: "border-border bg-surface-elevated/40 text-text-secondary",
    amber: "border-[#fcd34d]/30 bg-[#fcd34d]/10 text-[#fcd34d]",
    red: "border-[#fca5a5]/30 bg-[#fca5a5]/10 text-[#fca5a5]",
    green: "border-primary/30 bg-primary/10 text-primary",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

/** Minutes between dispatch and arrival, as "12 min" or "1 h 5 min". Null when unknown or negative. */
function responseTime(dispatch: string | null, arrival: string | null): string | null {
  if (!dispatch || !arrival) return null;
  const mins = Math.round((new Date(arrival).getTime() - new Date(dispatch).getTime()) / 60000);
  if (Number.isNaN(mins) || mins < 0) return null;
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
}

/** Props for the IncidentDetailModal component */
interface IncidentDetailModalProps {
  incidentId: number;
  open: boolean;
  onClose: () => void;
}

/** Fetches and renders full incident details inside a Modal. Handles loading, error, and empty states. */
export function IncidentDetailModal({
  incidentId,
  open,
  onClose,
}: IncidentDetailModalProps) {
  const { user } = useAuth();
  const canExportPdf = hasPermission(user, "export.csv");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncident = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await incidentService.getById(incidentId);
      setIncident(res.data);
    } catch {
      setError("Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    if (open) {
      setIncident(null);
      fetchIncident();
    }
  }, [open, fetchIncident]);

  const [downloading, setDownloading] = useState(false);
  // Separate from `error`, which replaces the incident details with a reload prompt.
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await exportService.downloadPdf(incidentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = incidentReportFileName(incident!);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const hasPin = incident?.latitude != null && incident?.longitude != null;
  const typeTone = incident?.type.toLowerCase().includes("positive")
    ? "red"
    : incident?.type.toLowerCase().includes("attempted")
      ? "amber"
      : "neutral";
  const response = incident ? responseTime(incident.dispatchTime, incident.arrivalTime) : null;
  const address = incident
    ? [incident.propertyAddress, incident.suburb, incident.city].filter(Boolean).join(", ")
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      className="max-w-4xl w-full max-h-[88vh] overflow-y-auto overflow-x-hidden border border-border-light p-0"
    >
      <button
        onClick={onClose}
        className="cursor-pointer absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors z-20"
        aria-label="Close"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
            <p className="text-sm text-text-secondary">Loading incident...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <svg className="h-8 w-8 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-danger">{error}</p>
          <button onClick={fetchIncident} className="cursor-pointer text-xs font-medium text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : incident ? (
        <div className="flex flex-col">
          <header className="border-b border-border-light bg-gradient-to-b from-primary/[0.06] to-transparent px-6 pb-5 pt-6 pr-14">
            <span className="font-mono text-xs tracking-wider text-primary">{incident.referenceNumber}</span>
            <h2 className="mt-1 text-xl font-bold leading-snug tracking-[-0.01em] text-text wrap-break-word">
              {incident.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip tone={typeTone}>{incident.type}</Chip>
              {incident.alarmType && <Chip>{incident.alarmType} alarm</Chip>}
              <Chip>
                {new Date(incident.incidentDate).toLocaleDateString("en-ZA", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Chip>
              {response && <Chip tone="green">{response} response</Chip>}
            </div>
          </header>

          <div className="grid gap-4 p-6">
            {hasPin ? (
              <div className="grid gap-2">
                <LocationMap lat={incident.latitude!} lng={incident.longitude!} className="h-60" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-xs text-text-subtle [overflow-wrap:anywhere]">{address}</p>
                  <a
                    href={googleMapsUrl(incident.latitude!, incident.longitude!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Open in Google Maps
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-border px-4 py-3.5 text-sm text-text-subtle">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                No location pinned{address ? ` · ${address}` : ""}
              </div>
            )}

            <Section title="Description">
              <p className="pt-1 text-sm leading-relaxed text-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {incident.description}
              </p>
            </Section>

            <div className="grid gap-4 md:grid-cols-2">
              {(incident.propertyAddress ||
                incident.clientName ||
                incident.clientCode ||
                incident.businessOrComplex ||
                incident.sapsReference) && (
                <Section title="Client & Property">
                  <DetailRow label="Property Address">{incident.propertyAddress || "-"}</DetailRow>
                  <DetailRow label="Client Name">{incident.clientName || "-"}</DetailRow>
                  <DetailRow label="Client Code" mono>{incident.clientCode || "-"}</DetailRow>
                  <DetailRow label="Business/Complex">{incident.businessOrComplex || "-"}</DetailRow>
                  <DetailRow label="SAPS Reference" mono>{incident.sapsReference || "-"}</DetailRow>
                </Section>
              )}

              {(incident.dispatchTime || incident.arrivalTime || incident.callSign) && (
                <Section title="Response">
                  {incident.dispatchTime && (
                    <DetailRow label="Dispatch Time">{formatDateTime(incident.dispatchTime)}</DetailRow>
                  )}
                  {incident.arrivalTime && (
                    <DetailRow label="Arrival Time">{formatDateTime(incident.arrivalTime)}</DetailRow>
                  )}
                  {response && <DetailRow label="Response Time">{response}</DetailRow>}
                  <DetailRow label="Call Sign" mono>{incident.callSign || "-"}</DetailRow>
                </Section>
              )}

              <Section title="Personnel">
                <DetailRow label="Operator">{incident.operatorName}</DetailRow>
                <DetailRow label="Dispatcher">{incident.dispatcher}</DetailRow>
                <DetailRow label="Reporter">{incident.reporter?.name || "Unknown"}</DetailRow>
              </Section>

              <Section title="Details">
                <DetailRow label="Incident Type">{incident.type}</DetailRow>
                <DetailRow label="Alarm Type">{incident.alarmType || "-"}</DetailRow>
                <DetailRow label="Created">{formatDateTime(incident.createdAt)}</DetailRow>
                <DetailRow label="Updated">{formatDateTime(incident.updatedAt)}</DetailRow>
              </Section>
            </div>
          </div>

          {(canExportPdf || downloadError) && (
            <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border-light bg-surface/95 px-6 py-4 backdrop-blur">
              {downloadError && (
                <p role="alert" className="text-sm text-danger">
                  {downloadError}
                </p>
              )}
              {canExportPdf && (
                <Button onClick={handleDownloadPdf} variant="secondary" size="sm" disabled={downloading}>
                  <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {downloading ? "Downloading..." : "Download PDF"}
                </Button>
              )}
            </footer>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
