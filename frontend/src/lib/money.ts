/**
 * Parses a Rand amount typed by an admin into integer cents, or null if it is
 * not a plain number. Spaces are ignored. Commas are rejected: "1,500" can mean
 * thousands or a decimal comma, and parseFloat silently read it as 1.
 */
export function randToCents(input: string, { allowNegative = false } = {}): number | null {
  const value = input.replace(/\s/g, "");
  const pattern = allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/;
  if (!pattern.test(value)) return null;
  return Math.round(Number(value) * 100);
}

export const RAND_FORMAT_MESSAGE = "Use digits and a dot for cents, e.g. 1500.00";
