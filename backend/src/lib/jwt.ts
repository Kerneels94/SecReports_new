/**
 * JWT token helpers — sign and verify access (15m) and refresh (12h) tokens
 * using secrets from environment variables.
 * NOTE: JWT_SECRET and JWT_REFRESH_SECRET must be set in production.
 * The server will refuse to start if either is missing.
 */
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * A session (refresh token) is valid for 12 hours — matching a 12-hour
 * control-room shift. Active use keeps sliding the window forward via
 * rotation; after 12 hours of inactivity the session expires.
 */
export const REFRESH_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/** Shape of the JWT payload embedded in both access and refresh tokens. */
interface TokenPayload {
  userId: string;
  role: string;
  companyId: string | null;
}

/**
 * Sign a short-lived access token (15-minute expiry).
 * @param payload - The user identity to embed in the token.
 * @returns A signed JWT string.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: "15m",
    jwtid: crypto.randomUUID(),
    issuer: "secreports-api",
    audience: "secreports-client",
  });
}

/**
 * Sign a refresh token (12-hour expiry).
 * @param payload - The user identity to embed in the token.
 * @returns A signed JWT string.
 */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_TTL_MS / 1000,
    jwtid: crypto.randomUUID(),
    issuer: "secreports-api",
    audience: "secreports-client",
  });
}

/**
 * Verify and decode an access token.
 * @param token - The JWT string to verify.
 * @returns The decoded payload if the token is valid.
 * @throws {JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyAccessToken(token: string): TokenPayload & { iat: number } {
  return jwt.verify(token, JWT_SECRET!, {
    issuer: "secreports-api",
    audience: "secreports-client",
  }) as TokenPayload & { iat: number };
}

/**
 * Verify and decode a refresh token.
 * @param token - The JWT string to verify.
 * @returns The decoded payload if the token is valid.
 * @throws {JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET!, {
    issuer: "secreports-api",
    audience: "secreports-client",
  }) as TokenPayload;
}
