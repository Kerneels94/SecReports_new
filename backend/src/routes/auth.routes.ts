/**
 * Auth routes — public and protected authentication endpoints.
 * Public: login, employee-login, register, refresh, forgot/reset password.
 * Protected (JWT): me, change-password, logout.
 * Owner-only: user CRUD.
 */
import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { requireRole } from "../middleware/requireRole";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/login", AuthController.login);
  fastify.post("/auth/employee-login", AuthController.employeeLogin);
  fastify.post("/auth/register", AuthController.register);
  fastify.post("/auth/refresh", AuthController.refresh);

  fastify.get("/auth/me", {
    preHandler: [fastify.authenticate],
    handler: AuthController.me,
  });

  fastify.patch("/auth/me/password", {
    preHandler: [fastify.authenticate],
    handler: AuthController.changePassword,
  });

  fastify.post("/auth/logout", {
    preHandler: [fastify.authenticate],
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
    preHandler: [fastify.authenticate, requireRole("owner")],
    handler: AuthController.createUser,
  });

  fastify.get("/auth/users", {
    preHandler: [fastify.authenticate, requireRole("owner")],
    handler: AuthController.listUsers,
  });

  fastify.get("/auth/users/:id", {
    preHandler: [fastify.authenticate, requireRole("owner")],
    handler: AuthController.getUserById,
  });

  fastify.patch("/auth/users/:id", {
    preHandler: [fastify.authenticate, requireRole("owner")],
    handler: AuthController.updateUser,
  });

  fastify.post("/auth/forgot-password", AuthController.forgotPassword);
  fastify.post("/auth/reset-password", AuthController.resetPassword);
}
