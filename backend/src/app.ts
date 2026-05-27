import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { verifyAccessToken } from "./lib/jwt";
import { UnauthorizedError } from "./lib/errors";
import { AppError } from "./lib/errors";
import authRoutes from "./routes/auth.routes";
import incidentRoutes from "./routes/incident.routes";
import reportRoutes from "./routes/report.routes";
import paystackRoutes from "./routes/paystack.routes";
import webhookRoutes from "./routes/webhook.routes";
import evidenceRoutes from "./routes/evidence.routes";
import exportRoutes from "./routes/export.routes";
import investigationRoutes from "./routes/investigation.routes";
import apiKeyRoutes from "./routes/apiKey.routes";

export async function buildApp() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await fastify.register(helmet);

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  fastify.decorateRequest("user", undefined);

  fastify.decorate("authenticate", async (request: any) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid token");
    }

    const token = header.substring(7);
    try {
      const payload = verifyAccessToken(token);
      request.user = { userId: payload.userId, role: payload.role, companyId: payload.companyId };
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  });

  await fastify.register(authRoutes);
  await fastify.register(incidentRoutes);
  await fastify.register(reportRoutes);
  await fastify.register(paystackRoutes);
  await fastify.register(webhookRoutes);
  await fastify.register(evidenceRoutes);
  await fastify.register(exportRoutes);
  await fastify.register(investigationRoutes);
  await fastify.register(apiKeyRoutes);

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    if ((error as any).statusCode === 429) {
      reply.code(429).send({
        success: false,
        error: {
          code: "RATE_LIMIT",
          message: "Too many requests",
        },
      });
      return;
    }

    request.log.error(error);
    reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });

  return fastify;
}
