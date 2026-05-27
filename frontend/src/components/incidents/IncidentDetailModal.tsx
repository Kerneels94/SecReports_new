"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { incidentService } from "@/services";
import type { Incident } from "@/types";

const severityVariant: Record<
  string,
  "default" | "warning" | "danger" | "info"
> = {
  low: "default",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

const statusVariant: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  draft: "default",
  submitted: "info",
  under_review: "warning",
  assigned: "info",
  investigating: "info",
  resolved: "success",
  closed: "success",
  rejected: "danger",
};

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

interface IncidentDetailModalProps {
  incidentId: number;
  open: boolean;
  onClose: () => void;
}

export function IncidentDetailModal({
  incidentId,
  open,
  onClose,
}: IncidentDetailModalProps) {
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      className="max-w-2xl max-h-[85vh] overflow-y-auto"
    >
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
            <div className="flex gap-1.5 shrink-0">
              <Badge
                variant={severityVariant[incident.severity] || "default"}
                dot
              >
                {incident.severity}
              </Badge>
              <Badge variant={statusVariant[incident.status] || "default"} dot>
                {incident.status.replace(/_/g, " ")}
              </Badge>
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
            <DetailRow label="Assignee">
              {incident.assignee?.name || "Unassigned"}
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
        </div>
      ) : null}
    </Modal>
  );
}
