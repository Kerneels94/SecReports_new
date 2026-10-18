"use client";

/**
 * IncidentDetailModal - A modal that fetches and displays the full details of a single incident.
 * Shows loading, error, and detail states. Includes a print/download action.
 */

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { incidentService, exportService } from "@/services";
import { incidentReportFileName } from "@/lib/reportName";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Incident } from "@/types";

/** A single label-value row used in the detail sections. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-light/30 py-2.5 last:border-0">
      <span className="text-xs font-medium text-text-secondary/60 shrink-0 w-28">
        {label}
      </span>
      <span className="text-sm text-text text-right">{children}</span>
    </div>
  );
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      className="max-w-4xl w-full max-h-[85vh] overflow-y-auto"
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors z-20"
        aria-label="Close"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-text-secondary">Loading incident...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <svg
            className="h-8 w-8 text-danger"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={fetchIncident}
            className="text-xs font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : incident ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="font-mono text-[11px] text-text-secondary/40 tracking-wider uppercase">
                {incident.referenceNumber}
              </span>
              <h2 className="text-lg font-bold text-text leading-snug wrap-break-word">
                {incident.title}
              </h2>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-text-secondary/60 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-text-secondary/60 uppercase tracking-wider mb-2">
              Personnel
            </h3>
            <DetailRow label="Operator">{incident.operatorName}</DetailRow>
            <DetailRow label="Dispatcher">{incident.dispatcher}</DetailRow>
          </div>

          {(incident.dispatchTime ||
            incident.arrivalTime ||
            incident.callSign) && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary/60 uppercase tracking-wider mb-2">
                Response
              </h3>
              {incident.dispatchTime && (
                <DetailRow label="Dispatch Time">
                  {new Date(incident.dispatchTime).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </DetailRow>
              )}
              {incident.arrivalTime && (
                <DetailRow label="Arrival Time">
                  {new Date(incident.arrivalTime).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </DetailRow>
              )}
              <DetailRow label="Call Sign">
                {incident.callSign || "-"}
              </DetailRow>
            </div>
          )}

          {(incident.propertyAddress ||
            incident.clientName ||
            incident.clientCode ||
            incident.businessOrComplex ||
            incident.sapsReference) && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary/60 uppercase tracking-wider mb-2">
                Client &amp; Property
              </h3>
              <DetailRow label="Property Address">
                {incident.propertyAddress || "-"}
              </DetailRow>
              <DetailRow label="Client Name">
                {incident.clientName || "-"}
              </DetailRow>
              <DetailRow label="Client Code">
                {incident.clientCode || "-"}
              </DetailRow>
              <DetailRow label="Business/Complex">
                {incident.businessOrComplex || "-"}
              </DetailRow>
              <DetailRow label="SAPS Reference">
                {incident.sapsReference || "-"}
              </DetailRow>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-text-secondary/60 uppercase tracking-wider mb-2">
              Details
            </h3>
            <DetailRow label="Type">{incident.type}</DetailRow>
            <DetailRow label="Location">{incident.location || "-"}</DetailRow>
            <DetailRow label="Incident Date">
              {new Date(incident.incidentDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DetailRow>
            <DetailRow label="Reporter">
              {incident.reporter?.name || "Unknown"}
            </DetailRow>
            <DetailRow label="Created">
              {new Date(incident.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </DetailRow>
            <DetailRow label="Updated">
              {new Date(incident.updatedAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </DetailRow>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-light/50">
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
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
