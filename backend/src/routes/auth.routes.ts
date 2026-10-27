/**
 * Auth routes — public and protected authentication endpoints.
 * Public: login, employee-login, register, refresh, forgot/reset password.
 * Protected (JWT): me, change-password, logout.
 * Admin-only: user CRUD.
 */
import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { requirePermission } from "../middleware/requirePermission";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/login", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, AuthController.login);
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
