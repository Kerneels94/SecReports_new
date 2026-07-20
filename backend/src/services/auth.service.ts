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
import { getAppUrl } from "../lib/app-url";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from "./email.service";
import { SubscriptionService } from "./subscription.service";

const MAX_LOGIN_ATTEMPTS = 3;
const BASE_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_LOCKOUT_MS = 4 * 60 * 60 * 1000;

/** Calculate lockout duration with exponential backoff (15min → 30min → 1hr → 2hr → 4hr cap). */
function lockoutDuration(lockoutCount: number): number {
  return Math.min(BASE_LOCKOUT_MS * Math.pow(2, lockoutCount), MAX_LOCKOUT_MS);
}

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

/** Creates an audit log entry for auth-sensitive operations. */
async function createAuditLog(params: {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  oldValues?: string;
  newValues?: string;
}): Promise<void> {
  await prisma.auditLog.create({ data: params });
}

/** Sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
async function persistRefreshToken(userId: string, familyId: string, deviceInfo?: string): Promise<string> {
  const raw = generateRawToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      familyId,
      deviceInfo: deviceInfo || null,
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
    const duration = lockoutDuration(user.lockoutCount);
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: attempts,
        lockoutCount: user.lockoutCount + 1,
        lockedUntil: new Date(Date.now() + duration),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: attempts },
    });
  }

  await createAuditLog({
    entityType: "user",
    entityId: userId,
    action: "login_failed",
    performedBy: userId,
    newValues: JSON.stringify({ loginAttempts: attempts }),
  });

  throw new UnauthorizedError("Invalid email or password");
}

/** Throws a generic auth error — never reveals whether the email exists. */
function throwGenericAuthError(): never {
  throw new UnauthorizedError("Invalid email or password");
}

/** Resets the login counter on successful authentication and decays lockout count. */
async function resetLoginAttempts(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
      lockoutCount: Math.max(0, user.lockoutCount - 1),
    },
  });
}

export const AuthService = {
  /**
   * Authenticates a user by email/password.
   * On success: resets login counter and returns tokens + a refresh token record.
   * On failure: increments login counter; locks account after 3 attempts for 15 min.
   */
  async login(params: LoginParams & { deviceInfo?: string }) {
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user) throwGenericAuthError();
    if (user.role !== "owner" && user.role !== "manager" && user.role !== "senior" && user.role !== "superadmin") throwGenericAuthError();
    if (!user.emailVerified) throwGenericAuthError();
    if (user.lockedUntil && user.lockedUntil > new Date()) throwGenericAuthError();

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) {
      return await handleLoginFailure(user.id);
    }

    await resetLoginAttempts(user.id);

    SubscriptionService.checkAndNotifyTrialEnding(user.companyId!).catch((err) =>
      console.error("[AuthService] Trial notification failed:", err),
    );

    const familyId = crypto.randomUUID();
    const payload = { userId: user.id, role: user.role, companyId: user.companyId };
    const refreshToken = await persistRefreshToken(user.id, familyId, params.deviceInfo);

    await createAuditLog({
      entityType: "user",
      entityId: user.id,
      action: "login",
      performedBy: user.id,
    });

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
  async employeeLogin(params: { email: string; password: string; deviceInfo?: string }) {
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user || user.role !== "guard") throwGenericAuthError();
    if (!user.emailVerified) throwGenericAuthError();
    if (user.lockedUntil && user.lockedUntil > new Date()) throwGenericAuthError();

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) {
      return await handleLoginFailure(user.id);
    }

    await resetLoginAttempts(user.id);

    const familyId = crypto.randomUUID();
    const payload = { userId: user.id, role: user.role, companyId: user.companyId };
    const refreshToken = await persistRefreshToken(user.id, familyId, params.deviceInfo);

    await createAuditLog({
      entityType: "user",
      entityId: user.id,
      action: "login",
      performedBy: user.id,
    });

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
  async refresh(refreshToken: string, deviceInfo?: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });
      await createAuditLog({
        entityType: "user",
        entityId: payload.userId,
        action: "refresh_token_reuse_detected",
        performedBy: payload.userId,
      });
      throw new UnauthorizedError("Refresh token has been revoked — all sessions invalidated");
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedError("User not found");

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newRaw = await persistRefreshToken(user.id, stored.familyId, deviceInfo);
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

  /** Returns the authenticated user's profile with trial status. */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User not found");

    let trial = null;
    if (user.companyId) {
      trial = await SubscriptionService.getTrialStatus(user.companyId);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
      trial,
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

    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: result.user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyLink = `${getAppUrl()}/verify-email?token=${rawToken}`;
    sendVerificationEmail(result.user.email, result.user.name, verifyLink).catch((err) =>
      console.error("[AuthService] Verification email failed:", err),
    );

    return { message: "Account created. Please check your email to verify your account." };
  },

  /** Verifies a user's email address using a token sent at registration. */
  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record) throw new ValidationError("Invalid or expired verification link");
    if (record.usedAt) throw new ValidationError("Verification link has already been used");
    if (record.expiresAt < new Date()) throw new ValidationError("Verification link has expired");

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: "Email verified successfully. You can now log in." };
  },

  /** Creates a user within a company after checking subscription user-limit. Sends verification email. */
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
        role: params.role || "senior",
        createdBy: params.createdBy,
      },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyLink = `${getAppUrl()}/verify-email?token=${rawToken}`;
    sendVerificationEmail(user.email, user.name, verifyLink).catch((err) =>
      console.error("[AuthService] Verification email failed:", err),
    );

    await createAuditLog({
      entityType: "user",
      entityId: user.id,
      action: "user_created",
      performedBy: params.createdBy,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
      message: "Verification email sent",
    };
  },

  /**
   * Generates a password reset token, stores its sha256 hash in the DB, and
   * emails a reset link. Silent if email not found to prevent user enumeration.
   * A constant artificial delay masks timing side-channels.
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerified) {
      await sleep(200);
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const resetLink = `${getAppUrl()}/reset-password?token=${rawToken}`;
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
    const tokenHash = hashToken(token);

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

    await createAuditLog({
      entityType: "user",
      entityId: user.id,
      action: "password_reset",
      performedBy: user.id,
    });

    sendPasswordChangedEmail(user.email, user.name).catch((err) =>
      console.error("[AuthService] Password changed email failed:", err),
    );
  },

  /** Updates the user's password to a new hash. Invalidates all sessions and sends a notification email. */
  async changePassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User not found");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.refreshToken.deleteMany({ where: { userId } });

    await createAuditLog({
      entityType: "user",
      entityId: userId,
      action: "password_changed",
      performedBy: userId,
    });

    sendPasswordChangedEmail(user.email, user.name).catch((err) =>
      console.error("[AuthService] Password changed email failed:", err),
    );
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
  async updateUser(companyId: string, userId: string, data: { name?: string; email?: string; role?: string }, performedBy?: string, actorRole?: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundError("User not found");

    if (data.role) {
      if (actorRole !== "owner") {
        throw new ValidationError("Only the owner can change a user's role");
      }
      if (performedBy === userId) {
        throw new ValidationError("You cannot change your own role");
      }
    }

    if (data.email && data.email !== user.email) {
      const validDomain = await hasMxRecord(data.email);
      if (!validDomain) throw new ValidationError("Email domain does not accept mail");

      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictError("Email already in use");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email, emailVerified: false }),
        ...(data.role !== undefined && { role: data.role }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (data.role !== undefined && data.role !== user.role) {
      const oldValues: Record<string, string> = { userName: user.name };
      const newValues: Record<string, string> = { userName: updated.name };
      if (data.name !== undefined && data.name !== user.name) {
        oldValues.name = user.name;
        newValues.name = data.name;
      }
      if (data.role !== undefined) {
        oldValues.role = user.role;
        newValues.role = data.role;
      }
      if (data.email !== undefined && data.email !== user.email) {
        oldValues.email = user.email;
        newValues.email = data.email;
      }
      await createAuditLog({
        entityType: "user",
        entityId: userId,
        action: "role_changed",
        performedBy: performedBy || userId,
        oldValues: JSON.stringify(oldValues),
        newValues: JSON.stringify(newValues),
      });
    } else if (data.name !== undefined && data.name !== user.name) {
      await createAuditLog({
        entityType: "user",
        entityId: userId,
        action: "user_updated",
        performedBy: performedBy || userId,
        oldValues: JSON.stringify({ name: user.name }),
        newValues: JSON.stringify({ name: data.name }),
      });
    } else if (data.email !== undefined && data.email !== user.email) {
      await createAuditLog({
        entityType: "user",
        entityId: userId,
        action: "user_updated",
        performedBy: performedBy || userId,
        oldValues: JSON.stringify({ email: user.email }),
        newValues: JSON.stringify({ email: data.email }),
      });
    }

    return updated;
  },

  /**
   * Logs out by deleting the specific refresh token from the DB.
   * After this, the token can no longer be used to refresh.
   */
  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });

    if (record) {
      await createAuditLog({
        entityType: "user",
        entityId: record.userId,
        action: "logout",
        performedBy: record.userId,
      });
    }
  },

  /**
   * Logs out all sessions for a user by deleting every refresh token they own.
   */
  async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });

    await createAuditLog({
      entityType: "user",
      entityId: userId,
      action: "logout_all",
      performedBy: userId,
    });
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
