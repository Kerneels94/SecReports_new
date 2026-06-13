import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service";
import { loginSchema, employeeLoginSchema, refreshSchema, registerSchema, createUserSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateUserSchema } from "../validators/auth.schema";
import { ValidationError, ForbiddenError } from "../lib/errors";

export const AuthController = {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.login(parsed.data);
    reply.code(200).send({ success: true, data: result });
  },

  async employeeLogin(request: FastifyRequest, reply: FastifyReply) {
    const parsed = employeeLoginSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.employeeLogin(parsed.data);
    reply.code(200).send({ success: true, data: result });
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.refresh(parsed.data.refreshToken);
    reply.code(200).send({ success: true, data: result });
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await AuthService.getMe(request.user!.userId);
    reply.code(200).send({ success: true, data: user });
  },

  async register(request: FastifyRequest, reply: FastifyReply) {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.register(parsed.data);
    reply.code(201).send({ success: true, data: result });
  },

  async createUser(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const user = await AuthService.createUser({
      ...parsed.data,
      companyId: request.user!.companyId,
      createdBy: request.user!.userId,
    });
    reply.code(201).send({ success: true, data: user });
  },

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.forgotPassword(parsed.data.email);
    reply.code(200).send({ success: true, message: "If an account with that email exists, a reset link has been sent." });
  },

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.resetPassword(parsed.data.token, parsed.data.password);
    reply.code(200).send({ success: true, message: "Password has been reset successfully." });
  },

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.changePassword(request.user!.userId, parsed.data.currentPassword, parsed.data.newPassword);
    reply.code(200).send({ success: true, message: "Password changed successfully." });
  },

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    if (request.user!.role !== "owner") throw new ForbiddenError();

    const users = await AuthService.listUsers(request.user!.companyId);
    reply.code(200).send({ success: true, data: users });
  },

  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    if (request.user!.role !== "owner") throw new ForbiddenError();

    const { id } = request.params as { id: string };
    const user = await AuthService.getUserById(request.user!.companyId, id);
    reply.code(200).send({ success: true, data: user });
  },

  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    if (request.user!.role !== "owner") throw new ForbiddenError();

    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const { id } = request.params as { id: string };
    const user = await AuthService.updateUser(request.user!.companyId, id, parsed.data);
    reply.code(200).send({ success: true, data: user });
  },
};
