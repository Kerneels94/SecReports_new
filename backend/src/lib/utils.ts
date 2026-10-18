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
