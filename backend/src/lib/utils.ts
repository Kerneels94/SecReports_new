import crypto from "crypto";

/**
 * General-purpose utility functions.
 */

/**
 * Generates a unique incident reference number in the format INC-YYYY-RANDOM.
 * Uses the current year and a crypto-random 8-character hex string for uniqueness.
 */
export function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `INC-${year}-${random}`;
}

/**
 * Reads TRUST_PROXY for Fastify. On Render the socket peer is Render's
 * internal proxy, not localhost, so without a hop count every client shares
 * one IP and one rate-limit bucket. A number trusts exactly that many hops,
 * so request.ip is the address Render appended to X-Forwarded-For (clients
 * can only prepend, so they cannot spoof it). Defaults to localhost-only.
 */
export function parseTrustProxy(
  value: string | undefined,
): string | ((address: string, hop: number) => boolean) {
  if (!value) return "127.0.0.1";
  if (!/^\d+$/.test(value)) return value;
  // Fastify's types take no number, so express the hop count as a function.
  const hops = Number(value);
  return (_address, hop) => hop < hops;
}
