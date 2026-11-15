import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * The real client IP. Behind the Netlify /api proxy, request.ip is Netlify's
 * edge, so every user would share one rate-limit bucket. Netlify passes the
 * client in x-nf-client-connection-ip, but anyone can call Render directly and
 * set that header, so trust it only when Netlify's signature (x-nf-sign, the
 * `signed` option in netlify.toml) verifies with NETLIFY_PROXY_SECRET.
 */
export function clientIp(request: {
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}): string {
  const secret = process.env.NETLIFY_PROXY_SECRET;
  const sig = request.headers["x-nf-sign"];
  const nfIp = request.headers["x-nf-client-connection-ip"];
  if (secret && typeof sig === "string" && typeof nfIp === "string") {
    try {
      jwt.verify(sig, secret, { issuer: "netlify", algorithms: ["HS256"] });
      return nfIp;
    } catch {
      // Bad or forged signature: fall through to the socket-derived IP.
    }
  }
  return request.ip;
}

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
