/**
 * Business logic for authentication and user management. Handles login, registration,
 * password reset, and user CRUD with subscription limit enforcement.
 */
import crypto from "crypto";
import { prisma } from "../lib/db";
import { hashPassword, comparePassword } from "../lib/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { UnauthorizedError, ConflictError, NotFoundError } from "../lib/errors";
import { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from "./email.service";
import { SubscriptionService } from "./subscription.service";

/** Credentials for user login. */
interface LoginParams {
  email: string;
  password: string;
}

/** Registration data for a new company and owner user. */
interface RegisterParams {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

/** Data to create a new user within an existing company. */
interface CreateUserParams {
  name: string;
  email: string;
  password: string;
  role?: string;
  companyId: string;
  createdBy: string;
}

export const AuthService = {
  /** Authenticates a user by email/password and returns JWT access + refresh tokens. */
  async login(params: LoginParams) {
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const payload = { userId: user.id, role: user.role, companyId: user.companyId };

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        companyId: user.companyId,
      },
    };
  },

  /** Authenticates a guard employee by email/password. Restricted to users with the "guard" role. */
  async employeeLogin(params: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user || user.role !== "guard") throw new UnauthorizedError("Invalid email or password");

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const payload = { userId: user.id, role: user.role, companyId: user.companyId };

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        companyId: user.companyId,
      },
    };
  },

  /** Validates a refresh token and issues a new JWT access + refresh token pair. */
  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new UnauthorizedError("User not found");

    const newPayload = { userId: user.id, role: user.role, companyId: user.companyId };

    return {
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        companyId: user.companyId,
      },
    };
  },

  /** Returns the authenticated user's profile. */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User not found");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
    };
  },

  /** Creates a new company + owner user in a transaction, activates the free subscription, and sends a welcome email. */
  async register(params: RegisterParams) {
    const existingUser = await prisma.user.findUnique({ where: { email: params.email } });
    if (existingUser) throw new ConflictError("Email already in use");

    const existingCompany = await prisma.company.findUnique({ where: { email: params.email } });
    if (existingCompany) throw new ConflictError("Email already in use");

    const passwordHash = await hashPassword(params.password);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: params.companyName, email: params.email },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: params.name,
          email: params.email,
          passwordHash,
          role: "owner",
        },
      });

      return { company, user };
    });

    await SubscriptionService.activateFreePlan(result.company.id);

    sendWelcomeEmail(result.user.email, result.user.name).catch((err) => console.error("[AuthService] Welcome email failed:", err));

    const payload = { userId: result.user.id, role: result.user.role, companyId: result.company.id };

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        status: result.user.status,
        companyId: result.user.companyId,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
        email: result.company.email,
      },
    };
  },

  /** Creates a user within a company after checking subscription user-limit. Sends welcome email. */
  async createUser(params: CreateUserParams) {
    await SubscriptionService.canAddUser(params.companyId);

    const existing = await prisma.user.findUnique({ where: { email: params.email } });
    if (existing) throw new ConflictError("Email already in use");

    const passwordHash = await hashPassword(params.password);

    const user = await prisma.user.create({
      data: {
        companyId: params.companyId,
        name: params.name,
        email: params.email,
        passwordHash,
        role: (params.role as any) || "senior",
        createdBy: params.createdBy,
      },
    });

    sendWelcomeEmail(user.email, user.name).catch((err) => console.error("[AuthService] Welcome email failed:", err));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
    };
  },

  /** Generates a password reset token, stores its sha256 hash, and emails a reset link. Silent if email not found to prevent enumeration. */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;
    sendPasswordResetEmail(email, user.name, resetLink).catch((err) => console.error("[AuthService] Password reset email failed:", err));
  },

  /** Consumes a reset token and updates the user's password in a transaction, then sends a confirmation email. */
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(newPassword);

    const user = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return tx.user.update({
        where: { email: record.email },
        data: { passwordHash },
      });
    });

    sendPasswordChangedEmail(user.email, user.name).catch((err) =>
      console.error("[AuthService] Password changed email failed:", err),
    );
  },

  /** Validates the current password and updates to a new password hash. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User not found");

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Current password is incorrect");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  /** Lists all users in a company, ordered by creation date. */
  async listUsers(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Gets a single user scoped to a company by ID. */
  async getUserById(companyId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  /** Updates user fields with a duplicate email check before applying changes. */
  async updateUser(companyId: string, userId: string, data: { name?: string; email?: string; role?: string }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundError("User not found");

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictError("Email already in use");
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.role !== undefined && { role: data.role as any }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  },
};
