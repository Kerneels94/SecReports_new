"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { entryLogService } from "@/services";
import type { EntryLog } from "@/types";

export default function EntryLogsPage() {
  const [entries, setEntries] = useState<EntryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await entryLogService.listByCompany();
      setEntries(res.data);
    } catch {
      setError("Failed to load vehicle access logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Vehicle Access Logs</h1>
          <p className="text-sm text-text-secondary mt-1">Vehicle and visitor access records across all sites</p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-danger">{error}</p>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">No vehicle access logs recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Vehicle</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Driver</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Site</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Entry Time</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Exit Time</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-light hover:bg-surface-elevated/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-text">{e.vehicleReg}</p>
                    {e.vehicleDesc && <p className="text-xs text-text-secondary">{e.vehicleDesc}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-text">{e.driverName}</p>
                    {e.driverContact && <p className="text-xs text-text-secondary">{e.driverContact}</p>}
                  </td>
                  <td className="py-3 px-4 text-text-secondary">{e.site?.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{new Date(e.entryTime).toLocaleString()}</td>
                  <td className="py-3 px-4 text-text-secondary">
                    {e.exitTime ? new Date(e.exitTime).toLocaleString() : "-"}
                  </td>
                  <td className="py-3 px-4">
                    {e.flaggedVehicle ? (
                      <Badge variant="danger">Flagged</Badge>
                    ) : (
                      <Badge variant="success">Cleared</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
