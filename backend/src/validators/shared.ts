/** Shared Zod refinements reused across validators. */
import { z } from "zod";

/** Accepts any string Date.parse() can turn into a valid date. */
export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date",
  });

/** Turns a camelCase field path into a readable label, e.g. operatorName -> "Operator name". */
function fieldLabel(path: PropertyKey[] = []): string {
  const key = [...path].reverse().find((part) => typeof part === "string");
  if (!key) return "";
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * First validation error as a sentence that names the failing field, so the
 * client can show "Email: Enter a valid email address" instead of "Invalid input".
 */
export function validationErrorMessage(
  error: z.ZodError,
  fallback = "Invalid input",
): string {
  const issue = error.issues?.[0];
  if (!issue) return fallback;

  const message = issue.message?.trim() || fallback;
  const label = fieldLabel(issue.path ?? []);
  if (!label || message.toLowerCase().includes(label.toLowerCase())) {
    return message;
  }
  return `${label}: ${message}`;
}

