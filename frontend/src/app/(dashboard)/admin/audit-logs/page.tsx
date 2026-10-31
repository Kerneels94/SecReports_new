"use client";

import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { adminAuditService } from "@/services";
import type { AuditLogEntry, PaginatedResponse } from "@/types";

const ENTITY_TYPES = [
  { value: "", label: "All Types" },
  { value: "user", label: "User" },
  { value: "incident", label: "Incident" },
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
};

const PANEL = "rounded-[18px] border border-border-light bg-surface";
const TH =
  "px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.09em] text-text-secondary/70 whitespace-nowrap";
const TD = "px-4 py-3.5 text-sm align-middle";

function ActionBadge({ action }: { action: string }) {
  const variant =
    action.includes("failed") || action.includes("reuse_detected")
      ? "danger"
      : action.includes("created") || action.includes("login")
        ? "success"
        : action.includes("flagged")
          ? "warning"
          : action.includes("deleted")
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

export default function AuditLogsPage() {
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
      const res = await adminAuditService.list({
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

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 0;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[clamp(26px,2.6vw,32px)] font-bold tracking-[-0.03em] text-text">
          Audit Logs
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Track activity and changes across your company.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
          {error}
        </div>
      )}

      <div className={`${PANEL} mb-4 flex flex-wrap items-end gap-x-4 gap-y-3 px-5 py-[18px]`}>
        <div className="inline-grid grid-flow-col rounded-xl border border-border bg-surface-secondary p-1" role="group" aria-label="Entity type">
          {ENTITY_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => { setEntityType(et.value); setPage(1); }}
              aria-pressed={entityType === et.value}
              className={`h-8 cursor-pointer rounded-lg px-3 text-[13px] font-medium transition-colors ${
                entityType === et.value
                  ? "bg-primary text-gray-900"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {et.label}
            </button>
          ))}
        </div>
        <div className="min-w-[150px]">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="h-10 w-full cursor-pointer rounded-[9px] border border-border bg-surface-secondary px-3 text-sm text-text-secondary transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="" className="bg-surface text-text-secondary">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val} className="bg-surface text-text-secondary">{label}</option>
            ))}
          </select>
        </div>
        <div className="relative ml-auto min-w-[260px]">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <Input
            placeholder="Search by user, email, or action..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className={`${PANEL} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-text-secondary">No audit log entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary/45">
                  <th className={TH}>Date</th>
                  <th className={TH}>User</th>
                  <th className={TH}>Action</th>
                  <th className={`${TH} hidden md:table-cell`}>Entity</th>
                  <th className={TH}>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((entry) => {
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
                      <tr
                        className="cursor-pointer select-none border-b border-border-light/60 transition-colors last:border-b-0 hover:bg-surface-elevated/25"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      >
                        <td className={`${TD} whitespace-nowrap font-mono text-text-secondary`}>
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className={TD}>
                          <div>
                            <p className="font-medium text-text">{entry.performedByUser.name}</p>
                            <p className="mt-0.5 text-xs text-text-secondary/60">{entry.performedByUser.email}</p>
                          </div>
                        </td>
                        <td className={TD}><ActionBadge action={entry.action} /></td>
                        <td className={`${TD} hidden capitalize text-text-secondary md:table-cell`}>
                          {entry.entityType.replace(/_/g, " ")}
                        </td>
                        <td className={`${TD} max-w-[200px] truncate text-text-secondary/70`}>{details || "—"}</td>
                      </tr>
                      {expandedId === entry.id && (
                        <tr className="border-b border-border-light/60 bg-surface-secondary/40">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="flex flex-wrap gap-6 text-sm">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-text-secondary/70">IP Address</p>
                                <p className="mt-1 font-mono text-text">{entry.ipAddress || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-text-secondary/70">Browser</p>
                                <p className="mt-1 text-text">{parseBrowser(entry.userAgent)}</p>
                              </div>
                              <div className="min-w-[200px] flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-text-secondary/70">User Agent</p>
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
        <div className="flex items-center justify-between gap-3 border-t border-border-light px-4 py-3.5 text-[13px] text-text-secondary/60">
          <span>
            {data
              ? `Page ${data.page}${data.total > data.perPage ? ` · ${data.total} entries` : ""}`
              : "Page 1"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
