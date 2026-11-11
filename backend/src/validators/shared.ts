/** Shared Zod refinements reused across validators. */
import { z } from "zod";

/** Accepts any string Date.parse() can turn into a valid date. */
export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date",
  });

/** Shannon entropy in bits per character. */
export function shannonEntropy(text: string): number {
  const counts = new Map<string, number>();
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let bits = 0;
  for (const n of counts.values()) {
    const p = n / text.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/**
 * True when the part before "@" looks typed-at-random: repetitive
 * ("aaaaaa", "ababab"), keyboard mash ("asdflkjqwer") or a keyboard-row
 * run ("qwerty", "asdfg").
 * ponytail: three heuristics, not a language model. Add a dictionary or a
 * verification-only flow if real addresses start getting rejected.
 */
export function isGibberishEmail(email: string): boolean {
  const local = email.split("@")[0].split("+")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!local) return true;

  // Only 1-2 distinct characters spread over 5+ chars (entropy <= 1 bit).
  if (local.length >= 5 && shannonEntropy(local) <= 1) return true;

  // 7+ consonants in a row never happens in real names; it does in mash.
  if (/[bcdfghjklmnpqrstvwxz]{7,}/.test(local)) return true;

  // 5+ keys in a row along one keyboard row, either direction.
  for (const row of KEYBOARD_ROWS) {
    for (const r of [row, [...row].reverse().join("")]) {
      for (let i = 0; i + 5 <= r.length; i++) {
        if (local.includes(r.slice(i, i + 5))) return true;
      }
    }
  }
  return false;
}

/** Message shown when an address fails the gibberish check. */
export const GIBBERISH_EMAIL_MESSAGE = "Enter a real email address";

/** Email format only: trimmed, lowercased, valid and at most 255 chars. */
export const emailFormat = z
  .string("Email is required")
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(255, "Email must be 255 characters or fewer");

/** Email for a brand-new address: valid format and not gibberish. */
export const newEmail = emailFormat.refine((value) => !isGibberishEmail(value), {
  message: GIBBERISH_EMAIL_MESSAGE,
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

