"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { exportService } from "@/services";

interface EmailReportModalProps {
  incidentId: number;
  incidentTitle: string;
  open: boolean;
  onClose: () => void;
}

export function EmailReportModal({
  incidentId,
  incidentTitle,
  open,
  onClose,
}: EmailReportModalProps) {
  const [email, setEmail] = useState("");
  const [format, setFormat] = useState<"csv" | "pdf">("pdf");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await exportService.emailReport(incidentId, email, format);
      setSent(true);
    } catch {
      setError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setFormat("pdf");
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Email Report" className="max-w-md w-full">
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg className="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm text-text text-center">
            Report for <span className="font-semibold">{incidentTitle}</span> sent to <span className="font-semibold">{email}</span>
          </p>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Send the report for <span className="font-semibold text-text">{incidentTitle}</span> as an email attachment.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="recipient@example.com"
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`cursor-pointer flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${format === "pdf" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`cursor-pointer flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${format === "csv" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
              >
                CSV
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
            <Button size="sm" onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
