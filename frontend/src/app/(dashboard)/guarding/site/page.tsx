/**
 * Site detail page — displays a single guarding site's info, guards, patrols, and vehicle access logs in tabs.
 * @route /guarding/site?id=<siteId>
 */
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { guardingSiteService, patrolReportService, entryLogService } from "@/services";
import type { GuardingSite, PatrolReport, EntryLog } from "@/types";

/** Inner component that reads site id from query params and loads site, patrol, and entry data. */
function SiteDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [site, setSite] = useState<GuardingSite | null>(null);
  const [patrols, setPatrols] = useState<PatrolReport[]>([]);
  const [entries, setEntries] = useState<EntryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"patrols" | "entries" | "guards">("patrols");

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [siteRes, patrolsRes, entriesRes] = await Promise.all([
        guardingSiteService.getById(id),
        patrolReportService.listBySite(id),
        entryLogService.listBySite(id),
      ]);
      setSite(siteRes.data);
      setPatrols(patrolsRes.data);
      setEntries(entriesRes.data);
    } catch {
      setError("Failed to load site details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!id) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-text-secondary">No site ID provided.</p>
          <Link href="/guarding/sites" className="mt-2 inline-block text-sm text-primary hover:underline">
            Back to sites
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-danger">{error || "Site not found"}</p>
          <Link href="/guarding/sites" className="mt-2 inline-block text-sm text-primary hover:underline">
            Back to sites
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/guarding/sites" className="text-sm text-primary hover:underline">
          &larr; Back to sites
        </Link>
        <h1 className="text-2xl font-bold text-text mt-2">{site.name}</h1>
        <p className="text-sm text-text-secondary mt-1">{site.address || "No address"}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text">{site.guards?.length ?? 0}</p>
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider mt-1">Guards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text">{patrols.length}</p>
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider mt-1">Patrols</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text">{entries.length}</p>
            <p className="text-xs text-text-secondary/70 uppercase tracking-wider mt-1">Vehicle Access Logs</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-border-light">
        {(["patrols", "entries", "guards"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              tab === t
                ? "text-primary border-primary"
                : "text-text-secondary border-transparent hover:text-text"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "patrols" && (
        <div className="space-y-3">
          {patrols.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-sm text-text-secondary">No patrol reports</CardContent>
            </Card>
          ) : (
            patrols.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text">
                        Patrol by {p.guard?.name} {p.guard?.surname}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {new Date(p.startedAt).toLocaleString()} {p.completedAt ? `- ${new Date(p.completedAt).toLocaleString()}` : "(in progress)"}
                      </p>
                      {p.notes && <p className="text-xs text-text-secondary mt-1">{p.notes}</p>}
                    </div>
                    <Badge variant={p.status === "completed" ? "success" : p.status === "in_progress" ? "warning" : "default"}>
                      {p.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "entries" && (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-sm text-text-secondary">No vehicle access logs</CardContent>
            </Card>
          ) : (
            entries.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text">{e.vehicleReg}</p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {e.driverName} {e.driverContact ? `(${e.driverContact})` : ""}
                      </p>
                      <p className="text-xs text-text-secondary">
                        In: {new Date(e.entryTime).toLocaleString()}
                        {e.exitTime ? ` | Out: ${new Date(e.exitTime).toLocaleString()}` : ""}
                      </p>
                      {e.purpose && <p className="text-xs text-text-secondary mt-0.5">{e.purpose}</p>}
                    </div>
                    {e.flagged && !e.resolvedAt && (
                      <Badge variant="danger">Flagged</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "guards" && (
        <div className="space-y-3">
          {(!site.guards || site.guards.length === 0) ? (
            <Card>
              <CardContent className="p-4 text-center text-sm text-text-secondary">No guards assigned</CardContent>
            </Card>
          ) : (
            site.guards.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text">{g.name} {g.surname}</p>
                      <p className="text-xs text-text-secondary">{g.cellphone}</p>
                    </div>
                    <Badge variant={g.status === "active" ? "success" : g.status === "on_leave" ? "warning" : "default"}>
                      {g.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Site detail page — wraps SiteDetailInner in Suspense for useSearchParams. */
export default function SiteDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <SiteDetailInner />
    </Suspense>
  );
}
