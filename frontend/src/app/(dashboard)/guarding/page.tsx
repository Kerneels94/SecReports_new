/**
 * Guarding dashboard — overview of guarding operations: sites count, guards, patrols, and site list.
 * @route /guarding
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { guardingSiteService, entryLogService } from "@/services";
import type { GuardingSite, EntryLog } from "@/types";

/** Guarding dashboard component with stat cards, site list, and flagged vehicles overview. */
export default function GuardingDashboard() {
  const [sites, setSites] = useState<GuardingSite[]>([]);
  const [flaggedEntries, setFlaggedEntries] = useState<EntryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sitesRes, entriesRes] = await Promise.all([
        guardingSiteService.list(),
        entryLogService.listByCompany(),
      ]);
      setSites(sitesRes.data);
      setFlaggedEntries(entriesRes.data.filter((e) => e.flagged && !e.resolvedAt));
    } catch {
      setError("Failed to load guarding data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalGuards = sites.reduce((sum, s) => sum + (s._count?.guards ?? 0), 0);
  const totalPatrols = sites.reduce((sum, s) => sum + (s._count?.patrolReports ?? 0), 0);
  const totalEntries = sites.reduce((sum, s) => sum + (s._count?.entryLogs ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-danger">{error}</p>
          <button onClick={fetchData} className="mt-2 text-sm text-primary hover:underline">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Guarding</h1>
          <p className="text-sm text-text-secondary mt-1">Manage sites, patrols, and access control</p>
        </div>
        <Link
          href="/guarding/sites"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
        >
          Manage Sites
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Sites</p>
            <p className="text-2xl font-bold text-text mt-1">{sites.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Guards</p>
            <p className="text-2xl font-bold text-text mt-1">{totalGuards}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Patrols</p>
            <p className="text-2xl font-bold text-text mt-1">{totalPatrols}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Flagged Vehicles</p>
            <p className="text-2xl font-bold text-danger mt-1">{flaggedEntries.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sites</CardTitle>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <p className="text-sm text-text-secondary">No sites yet. Create your first guarding site.</p>
            ) : (
              <div className="space-y-3">
                {sites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/guarding/site?id=${site.id}`}
                    className="flex items-center justify-between rounded-lg border border-border-light p-3 hover:bg-surface-elevated/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{site.name}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{site.address || "No address"}</p>
                    </div>
                    <div className="flex gap-3 text-xs text-text-secondary">
                      <span>{site._count?.guards ?? 0} guards</span>
                      <span>{site._count?.entryLogs ?? 0} access logs</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flagged Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {flaggedEntries.length === 0 ? (
              <p className="text-sm text-text-secondary">No flagged vehicles across all sites.</p>
            ) : (
              <div className="space-y-3">
                {flaggedEntries.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-danger/20 bg-danger/5 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text">{e.vehicleReg}</p>
                      <span className="text-[10px] uppercase tracking-wider text-danger font-semibold">Flagged</span>
                    </div>
                    {e.flagReason && <p className="text-xs text-text-secondary mt-1">{e.flagReason}</p>}
                    <p className="text-xs text-text-secondary mt-1">{e.site?.name}</p>
                    <p className="text-xs text-text-secondary mt-1">{e.driverName}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
