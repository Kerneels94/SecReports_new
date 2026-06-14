/**
 * Server bootstrap — loads environment variables, builds the Fastify app,
 * and begins listening on the configured port (default 4000).
 */
import "dotenv/config";
import { buildApp } from "./app";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: Number(process.env.PORT) || 4000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
