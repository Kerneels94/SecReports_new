/**
 * Server bootstrap — loads environment variables, validates required secrets,
 * builds the Fastify app, and begins listening on the configured port (default 4000).
 */
import "dotenv/config";
import { buildApp } from "./app";

const MIN_SECRET_LENGTH = 32;

async function start() {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.error("FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment");
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    console.error(`FATAL: JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long`);
    process.exit(1);
  }

  if (process.env.JWT_REFRESH_SECRET.length < MIN_SECRET_LENGTH) {
    console.error(`FATAL: JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters long`);
    process.exit(1);
  }

  const app = await buildApp();

  try {
    await app.listen({ port: Number(process.env.PORT) || 4000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
