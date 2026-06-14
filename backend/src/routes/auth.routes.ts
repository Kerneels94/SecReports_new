/**
 * Auth routes — public and protected authentication endpoints.
 * Public: login, employee-login, register, refresh, forgot/reset password.
 * Protected (JWT): me, change-password, user CRUD (owner-only).
 */
import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";

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

  fastify.post("/auth/users", {
    preHandler: [fastify.authenticate],
    handler: AuthController.createUser,
  });

  fastify.get("/auth/users", {
    preHandler: [fastify.authenticate],
    handler: AuthController.listUsers,
  });

  fastify.get("/auth/users/:id", {
    preHandler: [fastify.authenticate],
    handler: AuthController.getUserById,
  });

  fastify.patch("/auth/users/:id", {
    preHandler: [fastify.authenticate],
    handler: AuthController.updateUser,
  });

  fastify.post("/auth/forgot-password", AuthController.forgotPassword);
  fastify.post("/auth/reset-password", AuthController.resetPassword);
}
