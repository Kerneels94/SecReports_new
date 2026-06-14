/**
 * General-purpose utility functions.
 */

/**
 * Generates a unique incident reference number in the format INC-YYYY-RANDOM.
 * Uses the current year and a 6-character alphanumeric string for uniqueness.
 */
export function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INC-${year}-${random}`;
}
