"use client";
import { useState, useEffect, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { adminAuditService } from "@/services";
import type { AuditLogEntry, PaginatedResponse } from "@/types";
const ENTITY_TYPES = [
  { value: "", label: "All Types" },
  { value: "user", label: "User" },
  { value: "incident", label: "Incident" },
  { value: "ledger", label: "Ledger" },
  { value: "report", label: "Report" },
];
const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  login_failed: "Login Failed",
  logout: "Logout",
  logout_all: "Logout All",
  password_changed: "Password Changed",
  password_reset: "Password Reset",
  user_created: "User Created",
  user_updated: "User Updated",
  user_deleted: "User Deleted",
  role_changed: "Role Changed",
  email_verified: "Email Verified",
  refresh_token_reuse_detected: "Token Reuse Detected",
  create: "Created",
  report_email_sent: "Report Emailed",
  report_batch_email_sent: "Batch Report Emailed",
  report_response_time_exported: "Response Time Report Exported",
  ledger_entry_posted: "Ledger Entry Posted",
  ledger_entry_voided: "Ledger Entry Voided",
};
function ActionBadge({ action }: { action: string }) {
  const variant =
    action.includes("failed") || action.includes("reuse_detected")
      ? "danger"
      : action.includes("created") || action.includes("login")
        ? "success"
        : action.includes("flagged")
          ? "warning"
          : action.includes("deleted") || action.includes("voided")
            ? "danger"
            : "info";
  return <Badge variant={variant}>{ACTION_LABELS[action] || action}</Badge>;
}
function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function parseBrowser(ua: string | null): string {
  if (!ua) return "Unknown";
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("OPR/")) return "Opera";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("SamsungBrowser/")) return "Samsung Internet";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/")) return "Safari";
  return "Other";
}
export default function AdminAuditLogsPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAuditService.listAll({
        page,
        perPage: 20,
        entityType: entityType || undefined,
        action: action || undefined,
        search: search || undefined,
      });
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [page, entityType, action, search]);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const totalPages = data ? Math.ceil(data.total / data.perPage) : 0;
  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    setError(null);
    try {
      const res = await adminAuditService.exportAll();
      setExportMsg(`Emailed ${res.data.count} entries to ${res.data.emailedTo.join(", ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Audit Logs</h1>
        <p className="text-sm text-text-secondary mt-1">
          Activity and changes across every company.
        </p>
      </div>
      {error && (
        <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
          {error}
        </div>
      )}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-2 flex-wrap">
              {ENTITY_TYPES.map((et) => (
                <button
                  key={et.value}
                  onClick={() => { setEntityType(et.value); setPage(1); }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    entityType === et.value
                      ? "bg-primary text-gray-900"
                      : "bg-surface-elevated/50 text-text-secondary hover:text-text hover:bg-surface-elevated"
                  }`}
                >
                  {et.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                className="rounded-lg border border-border-light bg-surface-elevated/50 px-3 py-1.5 text-xs font-medium text-text-secondary"
              >
                <option value="" className="bg-surface-elevated text-text-secondary">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-surface-elevated text-text-secondary">{label}</option>
                ))}
              </select>
            </div>
            <div className="sm:ml-auto">
              <Input
                placeholder="Search by company, user, email, or action..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-text">Export audit logs</p>
            <p className="text-xs text-text-secondary">Email the full PDF to the superadmin and that client.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} loading={exporting}>
              Email export
            </Button>
          </div>
        </CardContent>
      </Card>
      {exportMsg && (
        <div className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="status">
          {exportMsg}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !data || data.data.length === 0 ? (
            <p className="px-6 py-12 text-sm text-text-secondary text-center">No audit log entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Entity Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((entry, idx) => {
                    let details = "";
                    try {
                      if (entry.newValues && entry.oldValues) {
                        const newParsed = JSON.parse(entry.newValues);
                        const oldParsed = JSON.parse(entry.oldValues);
                        const changes: string[] = [];
                        for (const key of Object.keys(newParsed)) {
                          if (key === "userName") continue;
                          if (oldParsed[key] !== undefined && oldParsed[key] !== newParsed[key]) {
                            const label = key.charAt(0).toUpperCase() + key.slice(1);
                            changes.push(`${label}: ${oldParsed[key]} → ${newParsed[key]}`);
                          }
                        }
                        details = changes.join(", ");
                      } else if (entry.newValues) {
                        const parsed = JSON.parse(entry.newValues);
                        details = Object.entries(parsed)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ");
                      }
                    } catch {
                      details = entry.newValues || "";
                    }
                    return (
                      <Fragment key={entry.id}>
                      <tr className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors cursor-pointer select-none ${idx % 2 === 0 ? "bg-surface-elevated/10" : ""}`} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap" style={{ fontSize: "16px" }}>{formatDateTime(entry.createdAt)}</td>
                        <td className="px-4 py-3 text-text" style={{ fontSize: "16px" }}>{entry.performedByUser?.company?.name || "—"}</td>
                        <td className="px-4 py-3" style={{ fontSize: "16px" }}>
                          <div>
                            <p className="font-medium text-text">{entry.performedByUser?.name || "—"}</p>
                            <p className="text-text-secondary/70" style={{ fontSize: "13px" }}>{entry.performedByUser?.email || ""}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ fontSize: "16px" }}><ActionBadge action={entry.action} /></td>
                        <td className="px-4 py-3 text-text-secondary capitalize" style={{ fontSize: "16px" }}>{entry.entityType.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-text-secondary/70 max-w-[200px] truncate" style={{ fontSize: "16px" }}>{details || "—"}</td>
                      </tr>
                      {expandedId === entry.id && (
                        <tr className="border-b border-border-light/50 bg-surface-elevated/5">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="flex flex-wrap gap-6 text-sm">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">IP Address</p>
                                <p className="mt-1 font-mono text-text">{entry.ipAddress || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">Browser</p>
                                <p className="mt-1 text-text">{parseBrowser(entry.userAgent)}</p>
                              </div>
                              <div className="min-w-[200px] flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">User Agent</p>
                                <p className="mt-1 break-all text-text-secondary">{entry.userAgent || "—"}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {data && data.total > data.perPage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Showing {(data.page - 1) * data.perPage + 1}–{Math.min(data.page * data.perPage, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
