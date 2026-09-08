/**
 * Password hashing utilities wrapping bcrypt with a configurable salt-round
 * setting (default 12) read from the `BCRYPT_SALT_ROUNDS` environment variable.
 * Also exposes a SHA-256 digest helper for hashing tokens/keys before storage.
 */
import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

/** SHA-256 hex digest — used to hash tokens/API keys so raw values never hit the DB. */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Hash a plain-text password using bcrypt.
 * @param password - The plain-text password to hash.
 * @returns A bcrypt hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * @param password - The plain-text password to check.
 * @param hash - The bcrypt hash to compare against.
 * @returns `true` if the password matches the hash, `false` otherwise.
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
