/**
 * Last-seen API data kept in localStorage so a refresh paints instantly while fresh data loads.
 * Every key is prefixed so logout can wipe them all without touching the access token.
 * Storage can be blocked or full (private mode, quota): every call fails soft.
 */
const PREFIX = "cache:";

export function readCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota or blocked storage: the next load just fetches
  }
}

/** Removes every cached key, or only those starting with `match`. */
export function clearCache(match = ""): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX + match))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // blocked storage holds nothing to clear
  }
}
