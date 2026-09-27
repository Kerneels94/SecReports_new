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
import { UnauthorizedError, AppError } from "./lib/errors";
import { posthog } from "./lib/posthog";
import { SubscriptionService } from "./services/subscription.service";
import { runWithAuditContext } from "./lib/auditContext";
import authRoutes from "./routes/auth.routes";
import incidentRoutes from "./routes/incident.routes";
import reportRoutes from "./routes/report.routes";
import exportRoutes from "./routes/export.routes";

import invoiceRoutes from "./routes/invoice.routes";
import ledgerRoutes from "./routes/ledger.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import permissionRoutes from "./routes/permission.routes";

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
    exposedHeaders: ["Content-Disposition"],
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

  fastify.addHook("onRequest", (request, _reply, done) => {
    runWithAuditContext(
      { ipAddress: request.ip, userAgent: request.headers["user-agent"] as string },
      done,
    );
  });

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

    const path = request.url.split("?")[0];
    const isSubscriptionFlow =
      path.startsWith("/subscription") || path === "/auth/me";
    if (!isSubscriptionFlow) {
      await SubscriptionService.assertActive(request.user.companyId);
    }
  });

  await fastify.register(authRoutes);
  await fastify.register(incidentRoutes);
  await fastify.register(reportRoutes);

  await fastify.register(exportRoutes);

  await fastify.register(invoiceRoutes);
  await fastify.register(ledgerRoutes);
  await fastify.register(auditLogRoutes);
  await fastify.register(subscriptionRoutes);
  await fastify.register(permissionRoutes);

  fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string; validation?: unknown }, request, reply) => {
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

    if (error.validation) {
      // Schema rejection is bad input, not a server fault: without this it falls through to
      // the generic 500 and pollutes 5xx monitoring on every hand-typed ?months=7.
      reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters",
        },
      });
      return;
    }

    if (error.statusCode === 429) {
      reply.code(429).send({
        success: false,
        error: {
          code: "RATE_LIMIT",
          message: "Too many requests",
        },
      });
      return;
    }

    if (error.code === "P2002") {
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

    posthog?.capture({
      distinctId: (request.user as any)?.userId ?? "anonymous",
      event: "backend_error",
      properties: {
        code: error.code ?? "UNKNOWN",
        message: error.message,
        statusCode: error.statusCode ?? 500,
        path: request.url,
        method: request.method,
      },
    });

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
