/**
 * Application entry-point factory.
 * Configures and assembles the Fastify server instance with all plugins,
 * decorators, route registrations, and a unified error handler.
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import { verifyAccessToken } from "./lib/jwt";
import { UnauthorizedError } from "./lib/errors";
import { AppError } from "./lib/errors";
import authRoutes from "./routes/auth.routes";
import incidentRoutes from "./routes/incident.routes";
import reportRoutes from "./routes/report.routes";
import exportRoutes from "./routes/export.routes";

import apiKeyRoutes from "./routes/apiKey.routes";
import guardingSiteRoutes from "./routes/guardingSite.routes";
import guardRoutes from "./routes/guard.routes";
import patrolReportRoutes from "./routes/patrolReport.routes";
import entryLogRoutes from "./routes/entryLog.routes";
import invoiceRoutes from "./routes/invoice.routes";

/**
 * Creates and returns a fully-configured Fastify instance.
 * Registers CORS, helmet, rate-limiting, all route modules,
 * and a global error handler that serialises AppError subclasses into a
 * standard JSON envelope.
 */
export async function buildApp() {
  const fastify = Fastify({ logger: true });

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:3000"];

  await fastify.register(cors, {
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await fastify.register(cookie);

  fastify.decorateRequest("user", undefined);

  /**
   * Decorate the Fastify instance with an `authenticate` preHandler.
   * Extracts the Bearer token from the Authorization header, verifies it,
   * and attaches the decoded user payload to `request.user`.
   */
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

  await fastify.register(exportRoutes);

  await fastify.register(apiKeyRoutes);
  await fastify.register(guardingSiteRoutes);
  await fastify.register(guardRoutes);
  await fastify.register(patrolReportRoutes);
  await fastify.register(entryLogRoutes);
  await fastify.register(invoiceRoutes);

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

    if ((error as any).code === "P2002") {
      reply.code(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A record with that unique value already exists",
        },
      });
      return;
    }

    request.log.error(error);
    reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
    });
  });

  return fastify;
}
