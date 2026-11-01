"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { exportService } from "@/services";

interface MonthlyCrimeReportModalProps {
  open: boolean;
  onClose: () => void;
  onDownloaded: (blob: Blob & { filename?: string }) => void;
}

/** datetime-local has no offset, so build it from the browser's local clock. */
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function MonthlyCrimeReportModal({
  open,
  onClose,
  onDownloaded,
}: MonthlyCrimeReportModalProps) {
  const now = new Date();
  const [from, setFrom] = useState(() =>
    toLocalInput(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [to, setTo] = useState(() => toLocalInput(now));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (!from || !to || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setError("Choose a start and end date.");
      return;
    }
    if (fromDate >= toDate) {
      setError("The end date must be after the start date.");
      return;
    }

    setDownloading(true);
    setError(null);
    try {
      const blob = await exportService.downloadMonthlyCrimePdf(
        fromDate.toISOString(),
        toDate.toISOString(),
      );
      onDownloaded(blob);
      onClose();
    } catch {
      setError("Failed to download the monthly crime stat report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Monthly Crime Stat Report"
      className="max-w-md w-full"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Choose the date and time range for the report.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">From</span>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setError(null);
            }}
            className="scheme-dark rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">To</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setError(null);
            }}
            className="scheme-dark rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleDownload} loading={downloading}>
            Download
          </Button>
        </div>
      </div>
    </Modal>
  );
}
