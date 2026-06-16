import dns from "dns/promises";

const cache = new Map<string, { result: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function hasMxRecord(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  const cached = cache.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  try {
    const mxRecords = await dns.resolveMx(domain);
    const result = mxRecords.length > 0;
    cache.set(domain, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    cache.set(domain, { result: false, expiresAt: Date.now() + CACHE_TTL_MS });
    return false;
  }
}
