"use client";

/**
 * IncidentHeatMap - Leaflet map of incident hotspots on OpenStreetMap tiles.
 * Each cell is a soft circle: bigger and redder the more incidents it holds.
 * Leaflet touches `window`, so it is imported inside the effect, never during SSR.
 */

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { IncidentMapCell } from "@/services";
import { cn } from "@/lib/cn";

/** Amber (few) to rose (most), matching the dashboard's incident colours. */
const heatColor = (t: number) =>
  `hsl(${Math.round(38 - 38 * t)}, 90%, ${Math.round(50 - 5 * t)}%)`;

export function IncidentHeatMap({ cells, className }: { cells: IncidentMapCell[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    import("leaflet").then((L) => {
      if (cancelled || !el.current || cells.length === 0) return;
      map = L.map(el.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }).addTo(map);

      const max = cells[0].count; // backend sorts busiest first
      // Draw quiet cells first so hotspots sit on top.
      for (const c of [...cells].reverse()) {
        const t = c.count / max;
        const color = heatColor(t);
        L.circleMarker([c.lat, c.lng], {
          radius: 8 + 22 * Math.sqrt(t),
          stroke: false,
          fillColor: color,
          fillOpacity: 0.35 + 0.35 * t,
        })
          .bindTooltip(`${c.area || "Unnamed area"}: ${c.count} incident${c.count === 1 ? "" : "s"}`)
          .addTo(map);
      }
      map.fitBounds(L.latLngBounds(cells.map((c) => [c.lat, c.lng])), { padding: [30, 30], maxZoom: 14 });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [cells]);

  return (
    <div
      ref={el}
      role="region"
      aria-label="Incident hotspot map"
      className={cn("location-map relative z-0 h-64 w-full overflow-hidden rounded-xl border border-border", className)}
    />
  );
}
