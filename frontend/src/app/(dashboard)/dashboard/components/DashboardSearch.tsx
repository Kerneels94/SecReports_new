/**
 * DashboardSearch — search bar with autocomplete dropdown, type filter, and date range inputs.
 * Used on the Dashboard page to filter and search incidents.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { incidentService } from "@/services";
import { cn } from "@/lib/cn";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import type { Incident } from "@/types";

interface DashboardSearchProps {
  dateFrom: string;
  dateTo: string;
  typeFilter: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onTypeFilterChange: (v: string) => void;
}

/** DashboardSearch component with text search, type dropdown, start/end date pickers, and result dropdown. */
export function DashboardSearch({ dateFrom, dateTo, typeFilter, onDateFromChange, onDateToChange, onTypeFilterChange }: DashboardSearchProps) {
  const [query, setQuery] = useState("");
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

  const fetchResults = useCallback(async (q: string) => {
    if (!q) {
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
      if (typeFilter) params.type = typeFilter;
      const res = await incidentService.list(params);
      setResults(res.data.data);
      setTotal(res.data.total);
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query) {
      if (interactedRef.current) setOpen(true);
      debounceRef.current = setTimeout(() => {
        fetchResults(query);
      }, 300);
    } else {
      setResults([]);
      setTotal(0);
      setError(null);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  const handleFocus = () => {
    interactedRef.current = true;
    if (query) setOpen(true);
  };

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (typeFilter) params.set("type", typeFilter);
    return params.toString();
  };

  return (
    <>
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
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
            placeholder="Search by reference or keywords..."
            className={cn(
              "w-full rounded-xl border bg-surface/60 backdrop-blur-sm pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-secondary/40 transition-all duration-150",
              "focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15",
              query ? "border-primary/20" : "border-border-light",
            )}
          />
          {loading && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          )}
        </div>

        <select
          aria-label="Type"
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className={cn(
            "h-11 shrink-0 rounded-xl border bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-text transition-all duration-150 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15",
            typeFilter ? "border-primary/20" : "border-border-light",
          )}
        >
          <option value="">All types</option>
          <option value="attempted">Attempted</option>
          <option value="positive">Positive</option>
        </select>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <label className="block text-[11px] font-medium text-text-secondary/50 uppercase tracking-wider mb-1">Start Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full rounded-xl border border-border-light bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-text transition-all duration-150 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15 [color-scheme:dark]"
          />
        </div>
        <span className="text-text-secondary/30 text-xs shrink-0 mt-5">to</span>
        <div className="relative flex-1">
          <label className="block text-[11px] font-medium text-text-secondary/50 uppercase tracking-wider mb-1">End Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full rounded-xl border border-border-light bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-text transition-all duration-150 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15 [color-scheme:dark]"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { onDateFromChange(""); onDateToChange(""); }}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-text-secondary/60 hover:text-text hover:bg-surface-elevated ring-1 ring-border-light transition-all duration-150 mt-5"
            aria-label="Clear dates"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {open && query && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-surface shadow-2xl shadow-black/40 ring-1 ring-border-light animate-slide-up overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <svg className="h-8 w-8 text-danger/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-danger">{error}</p>
              <button
                onClick={() => fetchResults(query)}
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
