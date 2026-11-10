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
 * Resolves the real client address for rate limiting. Production runs behind
 * Cloudflare -> Render, where the socket peer is a varying internal proxy, so
 * prefer the address Cloudflare sets. Falls back to request.ip elsewhere.
 */
export function getClientIp(request: {
  headers: Record<string, string | string[] | undefined>;
  ip: string;
}): string {
  const forwarded = request.headers["cf-connecting-ip"];
  return (typeof forwarded === "string" && forwarded) || request.ip;
}
