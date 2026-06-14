/**
 * Password hashing utilities wrapping bcrypt with a consistent salt-round
 * configuration (12 rounds).
 */
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password using bcrypt with 12 salt rounds.
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
