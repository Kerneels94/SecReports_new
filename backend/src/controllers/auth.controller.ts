/**
 * Authentication controller — handles login, registration, token refresh,
 * password management, session management, and user administration.
 * Authorization is enforced via requireRole() preHandler on route definitions.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service";
import {
  loginSchema,
  employeeLoginSchema,
  registerSchema,
  createUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateUserSchema,
} from "../validators/auth.schema";
import { ValidationError } from "../lib/errors";

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60,
};

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie("refreshToken", token, COOKIE_OPTIONS);
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie("refreshToken", { path: "/" });
}

export const AuthController = {
  /** Authenticate a user with email and password, returning tokens. */
  async login(request: FastifyRequest, reply: FastifyReply) {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    const deviceInfo = (request.headers["user-agent"] as string) || undefined;
    const { refreshToken: _rt1, ...safeResult } = await AuthService.login({ ...parsed.data, deviceInfo });
    setRefreshCookie(reply, _rt1);
    reply.code(200).send({ success: true, data: safeResult });
  },

  /** Authenticate a guard employee using their email and password. */
  async employeeLogin(request: FastifyRequest, reply: FastifyReply) {
    const parsed = employeeLoginSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    const deviceInfo = (request.headers["user-agent"] as string) || undefined;
    const { refreshToken: _rt2, ...safeResult } = await AuthService.employeeLogin({ ...parsed.data, deviceInfo });
    setRefreshCookie(reply, _rt2);
    reply.code(200).send({ success: true, data: safeResult });
  },

  /** Refresh an expired access token using a valid refresh token. */
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) throw new ValidationError("Refresh token is required");

    const deviceInfo = (request.headers["user-agent"] as string) || undefined;
    const { refreshToken: _rt3, ...safeResult } = await AuthService.refresh(refreshToken, deviceInfo);
    setRefreshCookie(reply, _rt3);
    reply.code(200).send({ success: true, data: safeResult });
  },

  /** Return the currently authenticated user's profile. */
  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await AuthService.getMe(request.user!.userId);
    reply.code(200).send({ success: true, data: user });
  },

  /** Register a new company and its owner account. */
  async register(request: FastifyRequest, reply: FastifyReply) {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await AuthService.register(parsed.data);
    reply.code(201).send({ success: true, data: result });
  },

  /** Verify a user's email address using a token from the verification email. */
  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    const { token } = request.body as { token: string };
    if (!token) throw new ValidationError("Verification token is required");

    const result = await AuthService.verifyEmail(token);
    reply.code(200).send({ success: true, data: result });
  },

  /** Create a new user within the authenticated owner's company (owner-only via route). */
  async createUser(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

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
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.forgotPassword(parsed.data.email);
    reply.code(200).send({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  },

  /** Reset a user's password using a valid reset token. Invalidates all sessions. */
  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.resetPassword(parsed.data.token, parsed.data.password);
    clearRefreshCookie(reply);
    reply
      .code(200)
      .send({
        success: true,
        message: "Password has been reset successfully.",
      });
  },

  /** Change the authenticated user's password (requires current password). Invalidates all sessions. */
  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    await AuthService.changePassword(
      request.user!.userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    clearRefreshCookie(reply);
    reply
      .code(200)
      .send({ success: true, message: "Password changed successfully." });
  },

  /** List all users in the company (owner-only via route). */
  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await AuthService.listUsers(request.user!.companyId);
    reply.code(200).send({ success: true, data: users });
  },

  /** Get a single user by ID (owner-only via route). */
  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = await AuthService.getUserById(request.user!.companyId, id);
    reply.code(200).send({ success: true, data: user });
  },

  /** Update a user's details — only owner can change roles, and never their own. */
  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());

    const { id } = request.params as { id: string };

    const user = await AuthService.updateUser(
      request.user!.companyId,
      id,
      parsed.data,
      request.user!.userId,
      request.user!.role,
    );
    reply.code(200).send({ success: true, data: user });
  },

  /** Log out by deleting the provided refresh token. */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) throw new ValidationError("Refresh token is required");

    await AuthService.logout(refreshToken);
    clearRefreshCookie(reply);
    reply
      .code(200)
      .send({ success: true, message: "Logged out successfully." });
  },

  /** Log out all sessions for the current user. */
  async logoutAll(request: FastifyRequest, reply: FastifyReply) {
    await AuthService.logoutAll(request.user!.userId);
    clearRefreshCookie(reply);
    reply
      .code(200)
      .send({ success: true, message: "All sessions logged out." });
  },

  /** List active sessions for the current user. */
  async listSessions(request: FastifyRequest, reply: FastifyReply) {
    const sessions = await AuthService.listSessions(request.user!.userId);
    reply.code(200).send({ success: true, data: sessions });
  },
};
