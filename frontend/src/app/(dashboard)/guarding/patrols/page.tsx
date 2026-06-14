/**
 * Patrol reports page — view and filter patrol reports across all sites with site/date filters.
 * @route /guarding/patrols
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { patrolReportService, guardingSiteService } from "@/services";
import type { PatrolReport, GuardingSite } from "@/types";

/** Patrol reports page component with filters by site/date and a paginated table of patrol records. */
export default function PatrolsPage() {
  const [patrols, setPatrols] = useState<PatrolReport[]>([]);
  const [sites, setSites] = useState<GuardingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterSiteId, setFilterSiteId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const buildFilters = useCallback(() => {
    const filters: { siteId?: string; dateFrom?: string; dateTo?: string } = {};
    if (filterSiteId) filters.siteId = filterSiteId;
    if (filterDateFrom) filters.dateFrom = filterDateFrom;
    if (filterDateTo) filters.dateTo = filterDateTo;
    return filters;
  }, [filterSiteId, filterDateFrom, filterDateTo]);

  const fetchPatrols = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await patrolReportService.listByCompany(buildFilters());
      setPatrols(res.data);
    } catch {
      setError("Failed to load patrol reports");
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  const fetchSites = useCallback(async () => {
    try {
      const res = await guardingSiteService.list();
      setSites(res.data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    fetchPatrols();
  }, [fetchPatrols]);

  const statusVariant = (status: string) => {
    if (status === "completed") return "success" as const;
    if (status === "in_progress") return "warning" as const;
    return "default" as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Patrol Reports</h1>
        <p className="text-sm text-text-secondary mt-1">View and filter patrol reports across all sites</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-text-secondary mb-1">Site</label>
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-text-secondary mb-1">From</label>
              <input
                type="datetime-local"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-text-secondary mb-1">To</label>
              <input
                type="datetime-local"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={fetchPatrols}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setFilterSiteId("");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
              className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
            >
              Reset
            </button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-danger">{error}</p>
          </CardContent>
        </Card>
      ) : patrols.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">No patrol reports found for the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Date</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Site</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Guard</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Duration</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Checkpoints</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {patrols.map((p) => {
                const start = new Date(p.startedAt);
                const end = p.completedAt ? new Date(p.completedAt) : null;
                const durationMs = end ? end.getTime() - start.getTime() : null;
                const durationStr = durationMs
                  ? `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`
                  : "In progress";

                return (
                  <tr key={p.id} className="border-b border-border-light hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 px-4 text-text">
                      <Link href={`/guarding/site?id=${p.siteId}`} className="hover:text-primary transition-colors">
                        {start.toLocaleDateString()}
                      </Link>
                      <p className="text-xs text-text-secondary">{start.toLocaleTimeString()}</p>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{p.site?.name}</td>
                    <td className="py-3 px-4 text-text">
                      {p.guard?.name} {p.guard?.surname}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{durationStr}</td>
                    <td className="py-3 px-4 text-text-secondary">{p._count?.checkpoints ?? 0}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
