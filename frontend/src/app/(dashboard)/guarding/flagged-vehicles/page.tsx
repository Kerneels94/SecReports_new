"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { flaggedVehicleService } from "@/services";
import type { FlaggedVehicle } from "@/types";

export default function FlaggedVehiclesPage() {
  const [vehicles, setVehicles] = useState<FlaggedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await flaggedVehicleService.list();
      setVehicles(res.data);
    } catch {
      setError("Failed to load flagged vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async (id: string) => {
    try {
      await flaggedVehicleService.resolve(id);
      await fetchData();
    } catch {
      setError("Failed to resolve flag");
    }
  };

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
          <h1 className="text-2xl font-bold text-text">Flagged Vehicles</h1>
          <p className="text-sm text-text-secondary mt-1">
            Suspicious vehicles flagged across all sites — visible to your entire company
          </p>
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

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">No vehicles currently flagged.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text">{v.vehicleReg}</p>
                      <Badge variant="danger">Active Flag</Badge>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">{v.reason}</p>
                    <div className="flex gap-4 mt-2 text-xs text-text-secondary">
                      <span>
                        Flagged by {v.flaggedBy?.name} {v.flaggedBy?.surname}
                      </span>
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                      <span>{v._count?.entryLogs ?? 0} sightings</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve(v.id)}
                    className="rounded-lg border border-border-light px-3 py-1.5 text-xs text-text hover:bg-surface-elevated transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
