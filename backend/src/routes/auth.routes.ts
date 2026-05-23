import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/login", AuthController.login);
  fastify.post("/auth/register", AuthController.register);
  fastify.post("/auth/refresh", AuthController.refresh);

  fastify.get("/auth/me", {
    preHandler: [fastify.authenticate],
    handler: AuthController.me,
  });

  fastify.post("/auth/users", {
    preHandler: [fastify.authenticate],
    handler: AuthController.createUser,
  });

  fastify.post("/auth/forgot-password", AuthController.forgotPassword);
  fastify.post("/auth/reset-password", AuthController.resetPassword);
}
