/**
 * Returns the base URL for the frontend application.
 * Falls back to localhost during local dev, otherwise the deployed app URL.
 * Override with the FRONTEND_URL environment variable.
 */
export function getAppUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    (process.env.ENVIRONMENT === "localhost"
      ? "http://localhost:3000"
      : "https://secreports.co.za")
  );
}
