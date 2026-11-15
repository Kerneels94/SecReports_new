/**
 * Auth routes — public and protected authentication endpoints.
 * Public: login, employee-login, register, refresh, forgot/reset password.
 * Protected (JWT): me, change-password, logout.
 * Admin-only: user CRUD.
 */
import { FastifyInstance, FastifyRequest } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { requirePermission } from "../middleware/requirePermission";
import { requireRole } from "../middleware/requireRole";

export default async function authRoutes(fastify: FastifyInstance) {
  // Per-account brute-force cap. Keyed on the submitted email whether or not the
  // account exists, so the visible 429 never reveals which emails are registered.
  // preHandler, not onRequest: the body must be parsed to read the email.
  // createRateLimit, not rateLimit(): the plugin runs only one rateLimit() hook
  // per request, so a second one would be skipped after the per-IP route limit.
  // shortcut: in-memory store, resets on restart and is per instance; use a Redis store if Render scales out.
  const checkLoginPerEmail = fastify.createRateLimit({
    max: 10,
    timeWindow: "15 minutes",
    keyGenerator: (req) =>
      `login:${String((req.body as { email?: unknown } | undefined)?.email ?? "").trim().toLowerCase()}`,
  });
  const loginPerEmail = async (req: FastifyRequest) => {
    const limit = await checkLoginPerEmail(req);
    if (!limit.isAllowed && limit.isExceeded) {
      const minutes = Math.max(1, Math.ceil(limit.ttlInSeconds / 60));
      throw Object.assign(
        new Error(
          `Too many login attempts for this account. Try again in ${minutes} minute${minutes === 1 ? "" : "s"} or reset your password.`,
        ),
        { statusCode: 429 },
      );
    }
  };
  fastify.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } }, preHandler: loginPerEmail },
    AuthController.login,
  );
  fastify.post("/auth/register", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, AuthController.register);
  fastify.post("/auth/verify-email", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, AuthController.verifyEmail);
  fastify.post("/auth/refresh", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, AuthController.refresh);

  fastify.get("/auth/me", {
    preHandler: [fastify.authenticate],
    handler: AuthController.me,
  });

  fastify.patch("/auth/me/password", {
    preHandler: [fastify.authenticate],
    handler: AuthController.changePassword,
  });

  fastify.post("/auth/logout", {
    handler: AuthController.logout,
  });

  fastify.post("/auth/logout-all", {
    preHandler: [fastify.authenticate],
    handler: AuthController.logoutAll,
  });

  fastify.get("/auth/sessions", {
    preHandler: [fastify.authenticate],
    handler: AuthController.listSessions,
  });

  // Gated by role, not permission: company permission overrides must never grant this.
  fastify.post("/auth/company/delete", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    preHandler: [fastify.authenticate, requireRole("admin")],
    handler: AuthController.deleteCompany,
  });

  fastify.post("/auth/users", {
    preHandler: [fastify.authenticate, requirePermission("users.manage")],
    handler: AuthController.createUser,
  });

  fastify.get("/auth/users", {
    preHandler: [fastify.authenticate, requirePermission("users.manage")],
    handler: AuthController.listUsers,
  });

  fastify.get("/auth/users/:id", {
    preHandler: [fastify.authenticate, requirePermission("users.manage")],
    handler: AuthController.getUserById,
  });

  fastify.patch("/auth/users/:id", {
    preHandler: [fastify.authenticate, requirePermission("users.update")],
    handler: AuthController.updateUser,
  });

  fastify.delete("/auth/users/:id", {
    preHandler: [fastify.authenticate, requirePermission("users.manage")],
    handler: AuthController.deleteUser,
  });

  fastify.post("/auth/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, AuthController.forgotPassword);
  fastify.post("/auth/reset-password", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, AuthController.resetPassword);
}
