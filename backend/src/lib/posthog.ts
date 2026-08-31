import { PostHog } from "posthog-node";

export const posthog =
  (process.env.POSTHOG_API_KEY &&
    new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    })) ||
  null;

const gracefulShutdown = async () => {
  console.log("Shutting down server, flushing PostHog events...");
  await posthog?.shutdown();
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
