"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { incidentService } from "@/services";
import type { Incident } from "@/types";

const severityVariant: Record<string, "default" | "warning" | "danger" | "info"> = {
  low: "default",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  submitted: "info",
  under_review: "warning",
  assigned: "info",
  investigating: "info",
  resolved: "success",
  closed: "success",
  rejected: "danger",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const perPage = 20;

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await incidentService.list({ page: String(page), perPage: String(perPage) });
      setIncidents(res.data.data);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Incidents</h1>
          <p className="text-sm text-text-secondary mt-1">{total} total incidents</p>
        </div>
        <Link href="/incidents/new">
          <Button>Report Incident</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-sm text-danger">{error}</p>
              <Button variant="secondary" onClick={fetchIncidents}>Retry</Button>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-sm text-text-secondary">No incidents found.</p>
              <Link href="/incidents/new">
                <Button>Report your first incident</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Ref #</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Title</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Severity</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Type</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Category</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Reporter</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-border hover:bg-surface-secondary transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {incident.referenceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/incidents/${incident.id}`} className="font-medium text-text hover:underline">
                          {incident.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={severityVariant[incident.severity] || "default"}>
                          {incident.severity}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant[incident.status] || "default"}>
                          {incident.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{incident.type}</td>
                      <td className="px-6 py-4 text-text-secondary">{incident.category}</td>
                      <td className="px-6 py-4 text-text-secondary">{incident.reporter?.name || "-"}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
