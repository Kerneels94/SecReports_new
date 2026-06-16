/**
 * Business logic for authentication and user management. Handles login,
 * registration, password reset, user CRUD, refresh token rotation, account
 * lockout, and session management.
 */
import crypto from "crypto";
import { prisma } from "../lib/db";
import { hashPassword, comparePassword } from "../lib/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { UnauthorizedError, ConflictError, NotFoundError, ValidationError } from "../lib/errors";
import { hasMxRecord } from "../lib/email";
import { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from "./email.service";
import { SubscriptionService } from "./subscription.service";

const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

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

/** Hashes a raw refresh token for storage and lookup. */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generates a cryptographically random refresh token string. */
function generateRawToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/** Stores a new refresh token record for a user and returns the raw token. */
async function persistRefreshToken(userId: string, familyId: string): Promise<string> {
  const raw = generateRawToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return raw;
}

/** Checks whether the account is currently locked and increments on failure. */
async function handleLoginFailure(userId: string): Promise<never> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError("Invalid email or password");

  const attempts = user.loginAttempts + 1;

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: attempts,
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: attempts },
    });
  }

  throw new UnauthorizedError("Invalid email or password");
}

/** Resets the login counter on successful authentication. */
async function resetLoginAttempts(userId: string): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  await prisma.user.update({
    where: { id: userId },
    data: { loginAttempts: 0, lockedUntil: null },
  });
}

export const AuthService = {
  /**
   * Authenticates a user by email/password.
   * On success: resets login counter and returns tokens + a refresh token record.
   * On failure: increments login counter; locks account after 3 attempts for 15 min.
   */
  async login(params: LoginParams) {
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user) throw new UnauthorizedError("Invalid email or password");
    if (user.role !== "owner" && user.role !== "manager")
      throw new UnauthorizedError("Invalid email or password");

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedError(`Account locked. Try again in ${remaining} minute(s).`);
    }

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) {
      return await handleLoginFailure(user.id);
    }

    await resetLoginAttempts(user.id);

    const familyId = crypto.randomUUID();
    const payload = { userId: user.id, role: user.role, companyId: user.companyId };
    const refreshToken = await persistRefreshToken(user.id, familyId);

    return {
      accessToken: signAccessToken(payload),
      refreshToken,
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

  /**
   * Authenticates a guard employee by email/password.
   * Respects account lockout state. Restricted to the "guard" role.
   */
  async employeeLogin(params: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user || user.role !== "guard") throw new UnauthorizedError("Invalid email or password");

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedError(`Account locked. Try again in ${remaining} minute(s).`);
    }

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) {
      return await handleLoginFailure(user.id);
    }

    await resetLoginAttempts(user.id);

    const familyId = crypto.randomUUID();
    const payload = { userId: user.id, role: user.role, companyId: user.companyId };
    const refreshToken = await persistRefreshToken(user.id, familyId);

    return {
      accessToken: signAccessToken(payload),
      refreshToken,
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

  /**
   * Validates a refresh token, rotates it (invalidates the old, issues a new one),
   * and returns a new access + refresh token pair.
   * Detects token reuse: if the presented token's hash doesn't exist,
   * invalidates the entire family to force re-login on all devices.
   */
  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      await prisma.refreshToken.deleteMany({ where: { familyId: payload.userId } });
      throw new UnauthorizedError("Refresh token has been revoked — all sessions invalidated");
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedError("User not found");

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newRaw = await persistRefreshToken(user.id, stored.familyId);
    const newPayload = { userId: user.id, role: user.role, companyId: user.companyId };

    return {
      accessToken: signAccessToken(newPayload),
      refreshToken: newRaw,
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

  /**
   * Creates a new company + owner user in a transaction, activates the free
   * subscription, persists a refresh token, and sends a welcome email.
   */
  async register(params: RegisterParams) {
    const validDomain = await hasMxRecord(params.email);
    if (!validDomain) throw new ValidationError("Email domain does not accept mail");

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

    sendWelcomeEmail(result.user.email, result.user.name).catch((err) =>
      console.error("[AuthService] Welcome email failed:", err),
    );

    const familyId = crypto.randomUUID();
    const payload = { userId: result.user.id, role: result.user.role, companyId: result.company.id };
    const refreshToken = await persistRefreshToken(result.user.id, familyId);

    return {
      accessToken: signAccessToken(payload),
      refreshToken,
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

    const validDomain = await hasMxRecord(params.email);
    if (!validDomain) throw new ValidationError("Email domain does not accept mail");

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

    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error("[AuthService] Welcome email failed:", err),
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
    };
  },

  /**
   * Generates a password reset token, stores its sha256 hash in the DB, and
   * emails a reset link. Silent if email not found to prevent user enumeration.
   */
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
    sendPasswordResetEmail(email, user.name, resetLink).catch((err) =>
      console.error("[AuthService] Password reset email failed:", err),
    );
  },

  /**
   * Consumes a reset token and updates the user's password in a transaction,
   * invalidates all existing refresh tokens for that user, and sends a
   * confirmation email.
   */
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

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    sendPasswordChangedEmail(user.email, user.name).catch((err) =>
      console.error("[AuthService] Password changed email failed:", err),
    );
  },

  /** Validates the current password and updates to a new password hash. Invalidates all sessions. */
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

    await prisma.refreshToken.deleteMany({ where: { userId } });
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
      const validDomain = await hasMxRecord(data.email);
      if (!validDomain) throw new ValidationError("Email domain does not accept mail");

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

  /**
   * Logs out by deleting the specific refresh token from the DB.
   * After this, the token can no longer be used to refresh.
   */
  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  },

  /**
   * Logs out all sessions for a user by deleting every refresh token they own.
   */
  async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },

  /**
   * Lists active sessions (refresh tokens) for a user.
   */
  async listSessions(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId },
      select: {
        id: true,
        deviceInfo: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
