"use client";

/**
 * LocationMap - Leaflet map with one pin on OpenStreetMap tiles.
 * Read-only by default. With `onChange`, the pin is draggable and a click on
 * the map moves it, so the operator can correct a rough geocode.
 * Leaflet touches `window`, so it is imported inside the effect, never during SSR.
 */

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { cn } from "@/lib/cn";

interface LocationMapProps {
  lat: number;
  lng: number;
  /** Called with the new point when the pin is dragged or the map is clicked. */
  onChange?: (lat: number, lng: number) => void;
  /** Starting zoom. Later pin moves zoom in to at least street level. */
  zoom?: number;
  className?: string;
}

const PIN_HTML =
  '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#86efac;border:3px solid #18181b;box-shadow:0 0 0 2px #86efac,0 6px 14px rgba(0,0,0,.5)"></span>';

/** Shows a pinned location. Pass `onChange` to make the pin editable. */
export function LocationMap({ lat, lng, onChange, zoom = 16, className }: LocationMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const editable = !!onChange;

  // Build the map once; later coordinate changes only move the pin.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      const m = L.map(el.current, { scrollWheelZoom: false }).setView([lat, lng], zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · Geocoding <a href="https://photon.komoot.io" target="_blank" rel="noopener">Photon</a>',
      }).addTo(m);
      const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [22, 22], iconAnchor: [11, 26] });
      const pin = L.marker([lat, lng], { icon, draggable: editable, keyboard: editable }).addTo(m);
      if (editable) {
        pin.on("dragend", () => {
          const p = pin.getLatLng();
          onChangeRef.current?.(p.lat, p.lng);
        });
        m.on("click", (e) => {
          pin.setLatLng(e.latlng);
          onChangeRef.current?.(e.latlng.lat, e.latlng.lng);
        });
      }
      map.current = m;
      marker.current = pin;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- coordinates are synced by the effect below
  }, [editable]);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    marker.current.setLatLng([lat, lng]);
    map.current.setView([lat, lng], Math.max(map.current.getZoom(), 15));
  }, [lat, lng]);

  return (
    <div
      ref={el}
      role="region"
      aria-label={editable ? "Incident location map. Drag the pin or click to move it." : "Incident location map"}
      className={cn("location-map relative z-0 h-64 w-full overflow-hidden rounded-xl border border-border", className)}
    />
  );
}
