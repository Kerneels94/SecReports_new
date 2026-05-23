"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { incidentService } from "@/services";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import type { Incident } from "@/types";

const severityVariant: Record<string, "default" | "warning" | "danger" | "info"> = {
  low: "default",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

export function DashboardSearch() {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDates, setShowDates] = useState(false);
  const [results, setResults] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const fetchResults = useCallback(async (q: string, from: string, to: string) => {
    if (!q && !from && !to) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: "1", perPage: "5" };
      if (q) params.search = q;
      if (from) params.dateFrom = from;
      if (to) params.dateTo = to;
      const res = await incidentService.list(params);
      setResults(res.data.data);
      setTotal(res.data.total);
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const hasFilters = query || dateFrom || dateTo;
    if (hasFilters) {
      if (interactedRef.current) setOpen(true);
      debounceRef.current = setTimeout(() => {
        fetchResults(query, dateFrom, dateTo);
      }, 300);
    } else {
      setResults([]);
      setTotal(0);
      setError(null);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, dateFrom, dateTo, fetchResults]);

  const handleFocus = () => {
    interactedRef.current = true;
    if (query || dateFrom || dateTo) setOpen(true);
  };

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  };

  const hasActiveFilters = !!(query || dateFrom || dateTo);

  return (
    <>
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/60 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => { interactedRef.current = true; setQuery(e.target.value); }}
            onFocus={handleFocus}
            placeholder="Search incidents by title or reference..."
            className={cn(
              "w-full rounded-xl border bg-surface/60 backdrop-blur-sm pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-secondary/40 transition-all duration-150",
              "focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15",
              hasActiveFilters ? "border-primary/20" : "border-border-light",
            )}
          />
          {loading && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowDates(!showDates)}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-150",
            showDates
              ? "bg-primary/10 text-primary ring-1 ring-primary/25"
              : "text-text-secondary/60 hover:text-text hover:bg-surface-elevated ring-1 ring-border-light",
          )}
          aria-label="Toggle date filter"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {showDates && (
        <div className="mt-2 flex items-center gap-2 animate-slide-up">
          <div className="relative flex-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { interactedRef.current = true; setDateFrom(e.target.value); }}
              className="w-full rounded-xl border border-border-light bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-text transition-all duration-150 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15 [color-scheme:dark]"
              placeholder="From"
            />
          </div>
          <span className="text-text-secondary/40 text-xs shrink-0">to</span>
          <div className="relative flex-1">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { interactedRef.current = true; setDateTo(e.target.value); }}
              className="w-full rounded-xl border border-border-light bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-text transition-all duration-150 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15 [color-scheme:dark]"
              placeholder="To"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { interactedRef.current = true; setDateFrom(""); setDateTo(""); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-secondary/60 hover:text-text hover:bg-surface-elevated ring-1 ring-border-light transition-all duration-150"
              aria-label="Clear dates"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {open && (query || dateFrom || dateTo) && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-surface shadow-2xl shadow-black/40 ring-1 ring-border-light animate-slide-up overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <svg className="h-8 w-8 text-danger/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-danger">{error}</p>
              <button
                onClick={() => fetchResults(query, dateFrom, dateTo)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-3 w-24 rounded bg-surface-elevated/50" />
                  <div className="h-3 flex-1 rounded bg-surface-elevated/50" />
                  <div className="h-5 w-14 rounded-full bg-surface-elevated/50" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <svg className="h-8 w-8 text-text-secondary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <p className="text-sm text-text-secondary">No incidents match your search</p>
            </div>
          ) : (
            <div>
              <div className="flex flex-col divide-y divide-border-light/30">
                {results.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => { setSelectedIncidentId(incident.id); setOpen(false); }}
                    className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-surface-elevated/20 transition-colors"
                  >
                    <span className="font-mono text-xs text-text-secondary/50 w-28 shrink-0">
                      {incident.referenceNumber}
                    </span>
                    <span className="flex-1 text-sm font-medium text-text truncate">
                      {incident.title}
                    </span>
                    <Badge variant={severityVariant[incident.severity] || "default"} dot>
                      {incident.severity}
                    </Badge>
                    <span className="text-xs text-text-secondary/50 w-20 text-right shrink-0">
                      {new Date(incident.incidentDate).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
              {total > 5 && (
                <Link
                  href={`/incidents?${buildSearchParams()}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 border-t border-border-light/30 px-4 py-3 text-sm font-medium text-primary hover:bg-surface-elevated/20 transition-colors"
                >
                  View all {total} results
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>

      {selectedIncidentId && (
        <IncidentDetailModal
          incidentId={selectedIncidentId}
          open={!!selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}
    </>
  );
}
