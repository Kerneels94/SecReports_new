/**
 * JWT token helpers — sign and verify access (15m) and refresh (7d) tokens
 * using secrets from environment variables.
 */
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

/** Shape of the JWT payload embedded in both access and refresh tokens. */
interface TokenPayload {
  userId: string;
  role: string;
  companyId: string;
}

/**
 * Sign a short-lived access token (15-minute expiry).
 * @param payload - The user identity to embed in the token.
 * @returns A signed JWT string.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

/**
 * Sign a long-lived refresh token (7-day expiry).
 * @param payload - The user identity to embed in the token.
 * @returns A signed JWT string.
 */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

/**
 * Verify and decode an access token.
 * @param token - The JWT string to verify.
 * @returns The decoded payload if the token is valid.
 * @throws {JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Verify and decode a refresh token.
 * @param token - The JWT string to verify.
 * @returns The decoded payload if the token is valid.
 * @throws {JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
