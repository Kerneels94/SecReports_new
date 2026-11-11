import dns from "dns/promises";

const cache = new Map<string, { result: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/** DNS codes that mean "this record definitely does not exist", not a lookup failure. */
const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA"]);

function errorCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException).code;
}

/** True if the domain has an A or AAAA record; null if DNS failed transiently. */
async function hasAddressRecord(domain: string): Promise<boolean | null> {
  const lookups = [() => dns.resolve4(domain), () => dns.resolve6(domain)];
  for (const lookup of lookups) {
    try {
      if ((await lookup()).length > 0) return true;
    } catch (err) {
      if (!NOT_FOUND.has(errorCode(err) ?? "")) return null;
    }
  }
  return false;
}

/**
 * Resolves whether a domain accepts mail. null means a transient DNS
 * failure, so the caller must not cache the answer.
 * - MX records present: accepts mail, unless the only record is a null MX
 *   ("." per RFC 7505), which explicitly says the domain takes no mail.
 * - No MX records but the domain exists: SMTP delivers to its A/AAAA record
 *   (implicit MX, RFC 5321 section 5.1), so check for one of those.
 */
async function lookupDomain(domain: string): Promise<boolean | null> {
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords.length > 0) {
      // Node reports the null MX target "." as an empty exchange.
      return mxRecords.some((r) => r.exchange !== "" && r.exchange !== ".");
    }
  } catch (err) {
    const code = errorCode(err);
    // ENOTFOUND: the domain does not exist at all. Anything else but
    // ENODATA is a DNS hiccup, not an answer.
    if (code === "ENOTFOUND") return false;
    if (code !== "ENODATA") return null;
  }
  return hasAddressRecord(domain);
}

/**
 * True when the email's domain can receive mail (MX, or A/AAAA fallback).
 * Definitive answers are cached for an hour. A transient DNS failure returns
 * false without caching, so a hiccup doesn't block the domain for an hour.
 */
export async function acceptsMail(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  const cached = cache.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const result = await lookupDomain(domain);
  if (result === null) return false;

  cache.set(domain, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
