/**
 * Business logic for authentication and user management. Handles login,
 * registration, password reset, user CRUD, refresh token rotation, account
 * lockout, and session management.
 */
import crypto from "crypto";
import { prisma } from "../lib/db";
import { AuditLogService } from "./auditLog.service";
import { hashPassword, comparePassword, hashToken } from "../lib/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from "../lib/jwt";
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../lib/errors";
import { hasMxRecord } from "../lib/email";
import { getAppUrl } from "../lib/app-url";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendNewCompanyAlert,
} from "./email.service";
import { SubscriptionService } from "./subscription.service";
import { PermissionService } from "./permission.service";
import { posthog } from "../lib/posthog";
import type { UserRole } from "../generated/prisma/enums";

const MAX_LOGIN_ATTEMPTS = 3;
const BASE_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_LOCKOUT_MS = 4 * 60 * 60 * 1000;

/** A real bcrypt hash of a throwaway string — used to equalise login timing on the unknown-email path. */
const DUMMY_BCRYPT_HASH =
  "$2b$12$fVfsKL1jvOfJcoa0CWRsyeXCpyak/CPQ4/pVgSUIbz/CTvKLsNG.m";

/** Calculate lockout duration with exponential backoff (15min → 30min → 1hr → 2hr → 4hr cap). */
function lockoutDuration(lockoutCount: number): number {
  return Math.min(BASE_LOCKOUT_MS * Math.pow(2, lockoutCount), MAX_LOCKOUT_MS);
}

/** Credentials for user login. */
interface LoginParams {
  email: string;
  password: string;
}

/** Registration data for a new company and admin user. */
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
  role?: UserRole;
  companyId: string;
  createdBy: string;
  actorRole?: string;
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
  await AuditLogService.create(params);
}

/** Sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stores a new refresh token record for a user and returns the signed JWT. */
async function persistRefreshToken(
  user: { id: string; role: string; companyId: string | null },
  familyId: string,
  deviceInfo?: string,
): Promise<string> {
  const raw = signRefreshToken({
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
  });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      familyId,
      deviceInfo: deviceInfo || null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return raw;
}

/** Checks whether the account is currently locked and increments on failure. */
async function handleLoginFailure(userId: string): Promise<never> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { loginAttempts: { increment: 1 } },
  });

  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    const duration = lockoutDuration(user.lockoutCount);
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockoutCount: { increment: 1 },
        lockedUntil: new Date(Date.now() + duration),
      },
    });
  }

  await createAuditLog({
    entityType: "user",
    entityId: userId,
    action: "login_failed",
    performedBy: userId,
    newValues: JSON.stringify({ loginAttempts: user.loginAttempts }),
  });

  throw new UnauthorizedError("Invalid email or password");
}

/** Throws a generic auth error — never reveals whether the email exists. */
function throwGenericAuthError(): never {
  throw new UnauthorizedError("Invalid email or password");
}

/** True when the account must be denied authentication — shared by `login()` and `refresh()`
 *  so session rotation can never outrun the login gates. */
function authDenied(user: {
  role: string;
  emailVerified: boolean;
  lockedUntil: Date | null;
  status: string;
}): boolean {
  const roleAllowed =
    user.role === "admin" ||
    user.role === "manager" ||
    user.role === "senior" ||
    user.role === "superadmin";
  return (
    user.status !== "active" ||
    !roleAllowed ||
    !user.emailVerified ||
    (!!user.lockedUntil && user.lockedUntil > new Date())
  );
}

/** Throws ForbiddenError when a manager/senior's company free trial has expired. */
async function assertTrialNotExpired(user: {
  role: string;
  companyId: string | null;
}): Promise<void> {
  if (
    (user.role === "manager" || user.role === "senior") &&
    (await SubscriptionService.isTrialExpired(user.companyId))
  ) {
    throw new ForbiddenError(
      "Your organisation's free trial has ended. Please ask your administrator to upgrade the subscription before logging in.",
    );
  }
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
    const user = await prisma.user.findUnique({
      where: { email: params.email },
    });
    if (!user) {
      await comparePassword(params.password, DUMMY_BCRYPT_HASH);
      throwGenericAuthError();
    }
    if (authDenied(user)) throwGenericAuthError();

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) {
      return await handleLoginFailure(user.id);
    }

    await resetLoginAttempts(user.id);

    await assertTrialNotExpired(user);

    if (user.companyId) {
      SubscriptionService.checkAndNotifyTrialEnding(user.companyId).catch(
        (err) => console.error("[AuthService] Trial notification failed:", err),
      );
    }

    const familyId = crypto.randomUUID();
    const payload = {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
    };
    const refreshToken = await persistRefreshToken(
      user,
      familyId,
      params.deviceInfo,
    );

    await createAuditLog({
      entityType: "user",
      entityId: user.id,
      action: "login",
      performedBy: user.id,
    });

    if (
      posthog &&
      (user.role === "admin" || user.role === "superadmin")
    ) {
      posthog.capture({
        distinctId: user.id,
        event: "admin_login",
        properties: {
          companyId: user.companyId,
          role: user.role,
        },
      });
    }

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
        permissions: user.companyId
          ? await PermissionService.grantsForRole(user.companyId, user.role)
          : [],
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
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      await prisma.refreshToken.deleteMany({
        where: { userId: payload.userId },
      });
      await createAuditLog({
        entityType: "user",
        entityId: payload.userId,
        action: "refresh_token_reuse_detected",
        performedBy: payload.userId,
      });
      throw new UnauthorizedError(
        "Refresh token has been revoked — all sessions invalidated",
      );
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedError("User not found");

    // Re-run the same gates as login() so a locked, unverified, or
    // trial-expired account cannot keep rotating its refresh token.
    if (authDenied(user)) {
      await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      throwGenericAuthError();
    }
    try {
      await assertTrialNotExpired(user);
    } catch (err) {
      await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      throw err;
    }

    const consumed = await prisma.refreshToken.deleteMany({
      where: { id: stored.id },
    });
    if (consumed.count === 0) {
      throw new UnauthorizedError("Refresh token has already been used");
    }

    const newRaw = await persistRefreshToken(
      user,
      stored.familyId,
      deviceInfo,
    );
    const newPayload = {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
    };

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
        permissions: user.companyId
          ? await PermissionService.grantsForRole(user.companyId, user.role)
          : [],
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

    const permissions = user.companyId
      ? await PermissionService.grantsForRole(user.companyId, user.role)
      : [];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
      trial,
      permissions,
    };
  },

  /**
   * Creates a new company + admin user in a transaction, activates the free
   * subscription, persists a refresh token, and sends a welcome email.
   */
  async register(params: RegisterParams) {
    const validDomain = await hasMxRecord(params.email);
    if (!validDomain)
      throw new ValidationError("Email domain does not accept mail");

    const existingUser = await prisma.user.findUnique({
      where: { email: params.email },
    });
    if (existingUser) {
      return {
        message:
          "Account created. Please check your email to verify your account.",
      };
    }

    const existingCompany = await prisma.company.findUnique({
      where: { email: params.email },
    });
    if (existingCompany) {
      return {
        message:
          "Account created. Please check your email to verify your account.",
      };
    }

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
          role: "admin",
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
    sendVerificationEmail(
      result.user.email,
      result.user.name,
      verifyLink,
    ).catch((err) =>
      console.error("[AuthService] Verification email failed:", err),
    );

    sendNewCompanyAlert(
      result.company.name,
      result.user.name,
      result.user.email,
    ).catch((err) =>
      console.error("[AuthService] New company alert failed:", err),
    );

    return {
      message:
        "Account created. Please check your email to verify your account.",
    };
  },

  /** Verifies a user's email address using a token sent at registration. */
  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record)
      throw new ValidationError("Invalid or expired verification link");
    if (record.usedAt)
      throw new ValidationError("Verification link has already been used");
    if (record.expiresAt < new Date())
      throw new ValidationError("Verification link has expired");

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

    await createAuditLog({
      entityType: "user",
      entityId: record.userId,
      action: "email_verified",
      performedBy: record.userId,
    });

    return { message: "Email verified successfully. You can now log in." };
  },

  /** Creates a user within a company after checking subscription user-limit. Sends verification email. */
  async createUser(params: CreateUserParams) {
    // users.manage can be granted to managers; without this they could create an admin they control.
    if (params.role === "admin" && params.actorRole !== "admin") {
      throw new ForbiddenError("Only an admin can create an admin");
    }

    await SubscriptionService.canAddUser(params.companyId);

    const validDomain = await hasMxRecord(params.email);
    if (!validDomain)
      throw new ValidationError("Email domain does not accept mail");

    const existing = await prisma.user.findUnique({
      where: { email: params.email },
    });
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
    // Unverified users are served too: the reset link proves mailbox ownership,
    // and resetPassword marks the email verified (golden rule #32).
    if (!user || user.status !== "active") {
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
        // Reset link proves mailbox ownership: verify the email and lift any
        // lockout. lockoutCount stays for escalation.
        data: { passwordHash, emailVerified: true, loginAttempts: 0, lockedUntil: null },
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

  /** Updates the user's password to a new hash after verifying the current one. Invalidates all sessions and sends a notification email. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User not found");

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

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
      where: { companyId, status: "active" },
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
  async updateUser(
    companyId: string,
    userId: string,
    data: { name?: string; email?: string; role?: UserRole },
    performedBy?: string,
    actorRole?: string,
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundError("User not found");

    // The edit form always sends the role, so only an actual change is a role change.
    if (data.role !== undefined && data.role !== user.role) {
      if (actorRole !== "admin") {
        throw new ValidationError("Only an admin can change a user's role");
      }
      if (performedBy === userId) {
        throw new ValidationError("You cannot change your own role");
      }
    }

    // Changing another user's email lets the actor receive the verification
    // link and reset flow, so it is admin-only (prevents manager→admin takeover).
    if (
      data.email !== undefined &&
      data.email !== user.email &&
      performedBy !== userId &&
      actorRole !== "admin"
    ) {
      throw new ForbiddenError("Only an admin can change another user's email");
    }

    if (data.email && data.email !== user.email) {
      const validDomain = await hasMxRecord(data.email);
      if (!validDomain)
        throw new ValidationError("Email domain does not accept mail");

      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing) throw new ConflictError("Email already in use");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined &&
          data.email !== user.email && {
            email: data.email,
            emailVerified: false,
          }),
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
    }

    // Email is handled independently of the role branch so a combined
    // role+email update always re-verifies the new address (golden rule #6).
    const emailChanged = data.email !== undefined && data.email !== user.email;
    if (emailChanged) {
      const roleChanged = data.role !== undefined && data.role !== user.role;
      if (!roleChanged) {
        await createAuditLog({
          entityType: "user",
          entityId: userId,
          action: "user_updated",
          performedBy: performedBy || userId,
          oldValues: JSON.stringify({ email: user.email }),
          newValues: JSON.stringify({ email: data.email }),
        });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const verifyLink = `${getAppUrl()}/verify-email?token=${rawToken}`;
      sendVerificationEmail(data.email!, updated.name, verifyLink).catch((err) =>
        console.error("[AuthService] Verification email failed:", err),
      );
    }

    return updated;
  },

  /** Deactivates a user (soft delete), frees their email for reuse, and revokes their tokens. Admin cannot delete themselves. */
  async deleteUser(companyId: string, userId: string, performedBy: string, actorRole?: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId, status: "active" },
    });
    if (!user) throw new NotFoundError("User not found");
    if (userId === performedBy) throw new ValidationError("You cannot delete your own account");
    if (user.role === "admin" && actorRole !== "admin") {
      throw new ForbiddenError("Only an admin can delete an admin");
    }

    await prisma.refreshToken.deleteMany({ where: { userId } });
    // Reset tokens are keyed by email, so they must not survive into a new account with the same address.
    await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });

    // Email is unique, so rename it to free the address. The reserved .invalid TLD can never receive mail.
    await prisma.user.update({
      where: { id: userId },
      data: { status: "inactive", email: `${user.email}.${userId}.invalid` },
    });

    await createAuditLog({
      entityType: "user",
      entityId: userId,
      action: "user_deleted",
      performedBy,
      oldValues: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
    });
  },

  /**
   * Logs out by deleting the specific refresh token from the DB.
   * After this, the token can no longer be used to refresh.
   */
  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
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
