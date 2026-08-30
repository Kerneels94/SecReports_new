/**
 * Builds a unique download name for incident report PDFs from the
 * incident reference number and the incident date.
 */
export interface ReportNameInput {
  id: number;
  referenceNumber?: string | null;
  incidentDate?: string | null;
}

/** Extracts the calendar date (YYYY-MM-DD) without timezone shifts. */
function formatDateOnly(value: string): string {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Removes characters that are unsafe or awkward in filenames. */
function sanitize(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "incident";
}

export function incidentReportFileName(incident: ReportNameInput): string {
  const ref = incident.referenceNumber
    ? sanitize(incident.referenceNumber)
    : `incident-${incident.id}`;
  const date = incident.incidentDate ? formatDateOnly(incident.incidentDate) : "";
  return date ? `${ref}_${date}.pdf` : `${ref}.pdf`;
}