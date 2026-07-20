"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { patrolExportService } from "@/services";

interface PatrolReportExportModalProps {
  open: boolean;
  onClose: () => void;
  filters: { siteId?: string; dateFrom?: string; dateTo?: string; siteName?: string };
}

export function PatrolReportExportModal({ open, onClose, filters }: PatrolReportExportModalProps) {
  const [format, setFormat] = useState<"csv" | "pdf">("pdf");
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState<"download" | "email">("download");
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = format === "pdf"
        ? await patrolExportService.downloadPdf(filters)
        : await patrolExportService.downloadCsv(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "pdf" ? "patrol-reports.pdf" : "patrol-reports.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await patrolExportService.emailReport(email, format, filters);
      setSent(true);
    } catch {
      setError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFormat("pdf");
    setEmail("");
    setActiveTab("download");
    setSent(false);
    setError(null);
    onClose();
  };

  const siteLabel = filters.siteName || "All Sites";

  return (
    <Modal open={open} onClose={handleClose} title="Export Patrol Report" className="max-w-md w-full">
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg className="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm text-text text-center">
            Patrol report for <span className="font-semibold">{siteLabel}</span> sent to <span className="font-semibold">{email}</span>
          </p>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Export patrol reports for <span className="font-semibold text-text">{siteLabel}</span>
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${format === "pdf" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${format === "csv" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
              >
                CSV
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Action</label>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="action-download"
                onClick={() => { setActiveTab("download"); setError(null); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${activeTab === "download" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
              >
                Download
              </button>
              <button
                type="button"
                data-testid="action-email"
                onClick={() => { setActiveTab("email"); setError(null); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${activeTab === "email" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:border-text-secondary/30"}`}
              >
                Email
              </button>
            </div>
          </div>

          {activeTab === "email" && (
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
          )}

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
            {activeTab === "download" ? (
              <Button size="sm" data-testid="submit-download" onClick={handleDownload} disabled={downloading}>
                {downloading ? "Downloading..." : "Download"}
              </Button>
            ) : (
              <Button size="sm" data-testid="submit-email" onClick={handleSendEmail} disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
