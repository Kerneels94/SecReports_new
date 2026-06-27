/**
 * Returns the base URL for the frontend application based on the ENVIRONMENT variable.
 * - localhost -> http://localhost:3000
 * - anything else (staging, production) -> https://roaring-sable-cba735.netlify.app
 */
export function getAppUrl(): string {
  const env = process.env.ENVIRONMENT || "staging";
  if (env === "localhost") {
    return "http://localhost:3000";
  }
  return "https://roaring-sable-cba735.netlify.app";
}
