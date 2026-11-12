"use client";

/**
 * AddressAutocomplete - Address input that suggests South African addresses
 * as the user types (Photon geocoder, debounced 350 ms). Picking a suggestion
 * hands back its coordinates, suburb and city. Typing freely still works:
 * the value is plain text, the pick is optional.
 */

import { useEffect, useId, useState } from "react";
import { searchAddress, type AddressSuggestion } from "@/lib/geocode";
import { cn } from "@/lib/cn";

interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (suggestion: AddressSuggestion) => void;
  error?: string;
  placeholder?: string;
}

/** Combobox over Photon results. Arrow keys move, Enter picks, Escape closes. */
export function AddressAutocomplete({
  label,
  value,
  onChange,
  onPick,
  error,
  placeholder,
}: AddressAutocompleteProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Only search after the user types, not when a pick fills the box.
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Short queries hide the list via `showList`, so stale results never show.
    if (query.trim().length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const found = await searchAddress(query, ctrl.signal);
        setResults(found);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const pick = (s: AddressSuggestion) => {
    onChange(s.street || s.label);
    onPick(s);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 3;

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text/90">
        {label}
      </label>
      <div
        className={cn(
          "relative flex items-center rounded-lg border border-border-light bg-surface-secondary transition-all duration-150 focus-within:ring-2 focus-within:ring-primary",
          error && "border-danger/60 focus-within:ring-danger/20",
        )}
      >
        <svg className="ml-3 h-4 w-4 shrink-0 text-text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-invalid={!!error}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="flex-1 bg-transparent px-2.5 py-2.5 text-sm text-text placeholder:text-text-secondary/60 outline-none"
        />
        {loading && (
          <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true" />
        )}
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface-raised p-1 shadow-2xl shadow-black/50"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-text-subtle">
              No match. Keep typing, or drop the pin on the map.
            </li>
          ) : (
            results.map((s, i) => (
              <li
                key={`${s.lat},${s.lng},${i}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-2.5 text-sm text-text",
                  i === active && "bg-primary/10 text-primary",
                )}
              >
                {s.label}
              </li>
            ))
          )}
        </ul>
      )}
      {failed && (
        <p className="text-xs text-text-subtle">Address search is unavailable. Type the address and drop the pin on the map.</p>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
