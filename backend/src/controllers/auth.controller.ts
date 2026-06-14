/**
 * Authentication controller — handles login, registration, token refresh, password management,
 * and user administration. Routes are a mix of public and owner-protected endpoints.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service";
import { loginSchema, employeeLoginSchema, refreshSchema, registerSchema, createUserSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateUserSchema } from "../validators/auth.schema";
import { ValidationError, ForbiddenError } from "../lib/errors";

export const AuthController = {
  /** Authenticate a user with email/phone and password, returning tokens. */
  async login(request: FastifyRequest, reply: FastifyReply) {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.login(parsed.data);
    reply.code(200).send({ success: true, data: result });
  },

  /** Authenticate a guard employee using their employee code and PIN. */
  async employeeLogin(request: FastifyRequest, reply: FastifyReply) {
    const parsed = employeeLoginSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.employeeLogin(parsed.data);
    reply.code(200).send({ success: true, data: result });
  },

  /** Refresh an expired access token using a valid refresh token. */
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.refresh(parsed.data.refreshToken);
    reply.code(200).send({ success: true, data: result });
  },

  /** Return the currently authenticated user's profile. */
  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await AuthService.getMe(request.user!.userId);
    reply.code(200).send({ success: true, data: user });
  },

  /** Register a new company and its owner account. */
  async register(request: FastifyRequest, reply: FastifyReply) {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.register(parsed.data);
    reply.code(201).send({ success: true, data: result });
  },

  /** Create a new user within the authenticated owner's company. */
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

  /** Send a password-reset email to the given address (if the account exists). */
  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.forgotPassword(parsed.data.email);
    reply.code(200).send({ success: true, message: "If an account with that email exists, a reset link has been sent." });
  },

  /** Reset a user's password using a valid reset token. */
  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.resetPassword(parsed.data.token, parsed.data.password);
    reply.code(200).send({ success: true, message: "Password has been reset successfully." });
  },

  /** Change the authenticated user's password (requires current password). */
  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.changePassword(request.user!.userId, parsed.data.currentPassword, parsed.data.newPassword);
    reply.code(200).send({ success: true, message: "Password changed successfully." });
  },

  /** List all users in the company (owner-only). */
  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    if (request.user!.role !== "owner") throw new ForbiddenError();

    const users = await AuthService.listUsers(request.user!.companyId);
    reply.code(200).send({ success: true, data: users });
  },

  /** Get a single user by ID (owner-only). */
  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    if (request.user!.role !== "owner") throw new ForbiddenError();

    const { id } = request.params as { id: string };
    const user = await AuthService.getUserById(request.user!.companyId, id);
    reply.code(200).send({ success: true, data: user });
  },

  /** Update a user's details (owner-only). */
  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    if (request.user!.role !== "owner") throw new ForbiddenError();

    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const { id } = request.params as { id: string };
    const user = await AuthService.updateUser(request.user!.companyId, id, parsed.data);
    reply.code(200).send({ success: true, data: user });
  },
};
