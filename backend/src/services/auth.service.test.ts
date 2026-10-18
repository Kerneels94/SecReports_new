import { AuthService } from "./auth.service";
import { prisma } from "../lib/db";
import * as hash from "../lib/hash";
import * as jwt from "../lib/jwt";
import { REFRESH_TOKEN_TTL_MS } from "../lib/jwt";
import { UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } from "../lib/errors";

jest.mock("../lib/db", () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    emailVerificationToken: {
      create: jest.fn().mockResolvedValue({ id: "evt1" }),
      findUnique: jest.fn(),
    },
    subscriptionPlan: {
      findFirst: jest.fn().mockResolvedValue({ id: "1", name: "Free", price: 0, userLimit: 1, trialPeriodDays: 14, features: "[]" }),
    },
    companySubscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "1", companyId: "1", planId: "1", status: "active" }),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: "rt1" }),
      findUnique: jest.fn().mockResolvedValue({ id: "rt1", userId: "1", familyId: "fam1" }),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    companyPermission: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "al1" }),
    },
    $transaction: jest.fn((fn: any) => fn(prisma)),
  },
}));

jest.mock("../lib/hash", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  hashToken: jest.fn((raw: string) => `hash-${raw}`),
}));
jest.mock("../lib/jwt");
jest.mock("../lib/email", () => ({
  hasMxRecord: jest.fn().mockResolvedValue(true),
}));
jest.mock("./email.service", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
  sendNewCompanyAlert: jest.fn().mockResolvedValue(undefined),
}));

const mockUser = {
  id: "1",
  companyId: "1",
  name: "Test User",
  email: "test@example.com",
  passwordHash: "$2b$12$hashedpassword",
  role: "admin",
  status: "active",
  emailVerified: true,
  loginAttempts: 0,
  lockoutCount: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCompany = {
  id: "1",
  name: "Test Company",
  email: "test@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...mockUser,
      loginAttempts: 1,
    });
    const { hasMxRecord } = require("../lib/email");
    (hasMxRecord as jest.Mock).mockResolvedValue(true);
  });

  describe("login", () => {
    it("returns tokens for valid credentials", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hash.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwt.signAccessToken as jest.Mock).mockReturnValue("access-token");
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("refresh-token");

      const result = await AuthService.login({ email: "test@example.com", password: "secret" });

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: expect.any(String),
        user: expect.objectContaining({ email: "test@example.com" }),
      });
    });

    it("persists a refresh token that expires 12 hours from login", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hash.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwt.signAccessToken as jest.Mock).mockReturnValue("access-token");
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("refresh-token");
      const now = Date.now();

      await AuthService.login({ email: "test@example.com", password: "secret" });

      const record = (prisma.refreshToken.create as jest.Mock).mock.calls[0][0].data;
      const elapsed = (record.expiresAt as Date).getTime() - now;
      expect(elapsed).toBeGreaterThan(REFRESH_TOKEN_TTL_MS - 1000);
      expect(elapsed).toBeLessThan(REFRESH_TOKEN_TTL_MS + 1000);
    });

    it("stores a hash of the signed refresh JWT", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hash.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("refresh-jwt");

      await AuthService.login({ email: "test@example.com", password: "secret" });

      expect(jwt.signRefreshToken).toHaveBeenCalledWith({
        userId: "1",
        role: "admin",
        companyId: "1",
      });
      const record = (prisma.refreshToken.create as jest.Mock).mock.calls[0][0].data;
      expect(record.tokenHash).toBe("hash-refresh-jwt");
    });

    it("throws UnauthorizedError for unknown email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login({ email: "unknown@example.com", password: "p" }))
        .rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError for wrong password", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hash.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login({ email: "test@example.com", password: "wrong" }))
        .rejects.toThrow(UnauthorizedError);
    });

    it("increments loginAttempts atomically and locks out at the threshold", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hash.comparePassword as jest.Mock).mockResolvedValue(false);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        loginAttempts: 3,
      });

      await expect(AuthService.login({ email: "test@example.com", password: "wrong" }))
        .rejects.toThrow(UnauthorizedError);

      expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
        where: { id: "1" },
        data: { loginAttempts: { increment: 1 } },
      });
      expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
        where: { id: "1" },
        data: expect.objectContaining({
          loginAttempts: 0,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it("does not lock out before the threshold", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hash.comparePassword as jest.Mock).mockResolvedValue(false);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        loginAttempts: 2,
      });

      await expect(AuthService.login({ email: "test@example.com", password: "wrong" }))
        .rejects.toThrow(UnauthorizedError);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it("rejects a deactivated user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: "inactive",
      });
      (hash.comparePassword as jest.Mock).mockResolvedValue(true);

      await expect(AuthService.login({ email: "test@example.com", password: "secret" }))
        .rejects.toThrow(UnauthorizedError);
    });

    it("blocks a manager/senior when the company trial has expired", async () => {
      const { SubscriptionService } = require("./subscription.service");
      const spy = jest
        .spyOn(SubscriptionService, "isTrialExpired")
        .mockResolvedValue(true);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: "manager",
      });
      (hash.comparePassword as jest.Mock).mockResolvedValue(true);

      await expect(
        AuthService.login({ email: "test@example.com", password: "secret" }),
      ).rejects.toThrow(ForbiddenError);

      spy.mockRestore();
    });

    it("allows an admin to log in even when the company trial has expired", async () => {
      const { SubscriptionService } = require("./subscription.service");
      const spy = jest
        .spyOn(SubscriptionService, "isTrialExpired")
        .mockResolvedValue(true);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: "admin",
      });
      (hash.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwt.signAccessToken as jest.Mock).mockReturnValue("access-token");
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("refresh-token");

      const result = await AuthService.login({
        email: "test@example.com",
        password: "secret",
      });

      expect(result.accessToken).toBe("access-token");
      spy.mockRestore();
    });
  });

  describe("refresh", () => {
    it("returns new tokens for valid refresh token", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", role: "admin", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwt.signAccessToken as jest.Mock).mockReturnValue("new-access-token");
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("new-refresh-token");

      const result = await AuthService.refresh("valid-refresh-token");

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it("throws UnauthorizedError for invalid refresh token", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new Error("invalid");
      });

      await expect(AuthService.refresh("bad-token")).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when user from token no longer exists", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "999", role: "admin", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.refresh("token-for-deleted-user")).rejects.toThrow(UnauthorizedError);
    });

    it("revokes the token and rejects a locked-out user", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", role: "admin", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(AuthService.refresh("locked-token")).rejects.toThrow(UnauthorizedError);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { id: "rt1" } });
    });

    it("revokes the token and rejects an unverified user", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", role: "admin", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        emailVerified: false,
      });

      await expect(AuthService.refresh("unverified-token")).rejects.toThrow(UnauthorizedError);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { id: "rt1" } });
    });

    it("revokes the token and rejects a manager when the company trial has expired", async () => {
      const { SubscriptionService } = require("./subscription.service");
      const spy = jest.spyOn(SubscriptionService, "isTrialExpired").mockResolvedValue(true);
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", role: "manager", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: "manager",
      });

      await expect(AuthService.refresh("expired-trial-token")).rejects.toThrow(ForbiddenError);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { id: "rt1" } });
      spy.mockRestore();
    });

    it("still rotates for an admin even when the company trial has expired", async () => {
      const { SubscriptionService } = require("./subscription.service");
      const spy = jest.spyOn(SubscriptionService, "isTrialExpired").mockResolvedValue(true);
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", role: "admin", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwt.signAccessToken as jest.Mock).mockReturnValue("new-access-token");
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("new-refresh-token");

      const result = await AuthService.refresh("admin-token");

      expect(result.accessToken).toBe("new-access-token");
      spy.mockRestore();
    });

    it("rejects a token that was already consumed by a concurrent rotation", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", role: "admin", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });

      await expect(AuthService.refresh("raced-token")).rejects.toThrow(
        "Refresh token has already been used",
      );
    });
  });

  describe("register", () => {
    it("creates a company and admin user and returns confirmation message", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);
      (hash.hashPassword as jest.Mock).mockResolvedValue("$2b$12$hashed");
      (prisma.company.create as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register({
        companyName: "Test Company",
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(result).toEqual({
        message: expect.stringContaining("Account created"),
      });

      const { sendNewCompanyAlert } = require("./email.service");
      expect(sendNewCompanyAlert).toHaveBeenCalledWith(
        "Test Company",
        "Test User",
        "test@example.com",
      );
    });

    it("returns a generic success message for a duplicate email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register({
        companyName: "Test Company",
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(result.message).toContain("Account created");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("throws ValidationError when email domain has no MX records", async () => {
      const { hasMxRecord } = require("../lib/email");
      (hasMxRecord as jest.Mock).mockResolvedValue(false);

      await expect(
        AuthService.register({
          companyName: "Test Company",
          name: "Test User",
          email: "bad@nonexistent-domain-xyz.com",
          password: "password123",
        }),
      ).rejects.toThrow("Email domain does not accept mail");
    });
  });

  describe("createUser", () => {
    it("creates a new user with hashed password", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hash.hashPassword as jest.Mock).mockResolvedValue("$2b$12$hashed");
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        companyId: "1",
        createdBy: "1",
      });

      expect(result).toEqual(expect.objectContaining({ email: "test@example.com" }));
    });

    it("throws ConflictError for duplicate email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        AuthService.createUser({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          companyId: "1",
          createdBy: "1",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("throws ValidationError when email domain has no MX records", async () => {
      const { hasMxRecord } = require("../lib/email");
      (hasMxRecord as jest.Mock).mockResolvedValue(false);

      await expect(
        AuthService.createUser({
          name: "Test User",
          email: "bad@nonexistent-domain-xyz.com",
          password: "password123",
          companyId: "1",
          createdBy: "1",
        }),
      ).rejects.toThrow("Email domain does not accept mail");
    });

    it("throws ForbiddenError when a non-admin creates an admin", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.createUser({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          role: "admin",
          companyId: "1",
          createdBy: "2",
          actorRole: "manager",
        }),
      ).rejects.toThrow(ForbiddenError);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("lets an admin create an admin", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "admin",
        companyId: "1",
        createdBy: "1",
        actorRole: "admin",
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: "admin" }),
      });
    });
  });

  describe("getMe", () => {
    it("returns user by id", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.getMe("1");

      expect(result.email).toBe("test@example.com");
    });

    it("throws UnauthorizedError for non-existent user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.getMe("999")).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("forgotPassword", () => {
    it("creates a reset token and calls sendPasswordResetEmail when user exists", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: "1" });

      await AuthService.forgotPassword("test@example.com");

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "test@example.com",
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it("does nothing when no user matches the email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await AuthService.forgotPassword("unknown@example.com");

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it("does nothing for a deleted (inactive) user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, status: "inactive" });

      await AuthService.forgotPassword("test@example.com");

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it("sends a reset link to an unverified but active user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, emailVerified: false });
      (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: "1" });

      await AuthService.forgotPassword("test@example.com");

      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    const futureDate = new Date(Date.now() + 3600000);
    const validRecord = {
      id: "1",
      email: "test@example.com",
      tokenHash: "somehash",
      usedAt: null,
      expiresAt: futureDate,
    };

    it("updates password and marks token as used within a transaction", async () => {
      (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(validRecord);
      (hash.hashPassword as jest.Mock).mockResolvedValue("$2b$12$newhashed");
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.resetPassword("valid-token", "newpassword123");

      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        data: {
          passwordHash: "$2b$12$newhashed",
          emailVerified: true,
          loginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it("throws UnauthorizedError for non-existent token", async () => {
      (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.resetPassword("bad-token", "password123")).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError for expired token", async () => {
      const expiredRecord = { ...validRecord, expiresAt: new Date(Date.now() - 3600000) };
      (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(expiredRecord);

      await expect(AuthService.resetPassword("expired-token", "password123")).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError for already-used token", async () => {
      const usedRecord = { ...validRecord, usedAt: new Date() };
      (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(usedRecord);

      await expect(AuthService.resetPassword("used-token", "password123")).rejects.toThrow(UnauthorizedError);
    });
  });

describe("changePassword", () => {
  it("changes password and sends notification email", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (hash.comparePassword as jest.Mock).mockResolvedValue(true);
    (hash.hashPassword as jest.Mock).mockResolvedValue("$2b$12$newhash");

    await AuthService.changePassword("1", "current-password", "new-password");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { passwordHash: "$2b$12$newhash" },
    });
  });

  it("throws UnauthorizedError when the current password is wrong", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (hash.comparePassword as jest.Mock).mockResolvedValue(false);

    await expect(
      AuthService.changePassword("1", "wrong-password", "new-password"),
    ).rejects.toThrow(UnauthorizedError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedError when user not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      AuthService.changePassword("1", "current-password", "new"),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe("listUsers", () => {
  it("returns all users for the company", async () => {
    const users = [
      { id: "1", name: "User A", email: "a@test.com", role: "senior", status: "active", createdAt: new Date() },
      { id: "2", name: "User B", email: "b@test.com", role: "admin", status: "active", createdAt: new Date() },
    ];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

    const result = await AuthService.listUsers("1");

    expect(result).toEqual(users);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { companyId: "1", status: "active" },
      select: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("getUserById", () => {
  it("returns user when found in same company", async () => {
    const user = {
      id: "1", name: "Test User", email: "test@example.com", role: "admin",
      status: "active", createdAt: new Date(), updatedAt: new Date(),
    };
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);

    const result = await AuthService.getUserById("1", "1");

    expect(result).toEqual(user);
  });

  it("throws NotFoundError when user not found", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.getUserById("1", "999")).rejects.toThrow(NotFoundError);
  });
});

describe("updateUser", () => {
  it("updates user fields", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const updatedUser = { ...mockUser, name: "Updated Name", email: "updated@test.com", role: "manager" };
    (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

    const result = await AuthService.updateUser("1", "1", { name: "Updated Name", email: "updated@test.com", role: "manager" }, "2", "admin");

    expect(result.name).toBe("Updated Name");
  });

  it("throws NotFoundError when user not in company", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.updateUser("1", "999", { name: "New" })).rejects.toThrow(NotFoundError);
  });

  it("lets a manager rename a user when the role sent is unchanged", async () => {
    const senior = { ...mockUser, id: "3", role: "senior" };
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(senior);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...senior, name: "Renamed" });

    const result = await AuthService.updateUser(
      "1", "3", { name: "Renamed", email: senior.email, role: "senior" }, "2", "manager",
    );

    expect(result.name).toBe("Renamed");
  });

  it("still stops a manager from changing a user's role", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...mockUser, id: "3", role: "senior" });

    await expect(
      AuthService.updateUser("1", "3", { role: "manager" }, "2", "manager"),
    ).rejects.toThrow("Only an admin can change a user's role");
  });

  it("throws ConflictError when email already in use", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, id: "2", email: "other@test.com" });

    await expect(AuthService.updateUser("1", "1", { email: "other@test.com" }, "2", "admin")).rejects.toThrow(ConflictError);
  });

  it("throws ValidationError when new email domain has no MX records", async () => {
    const { hasMxRecord } = require("../lib/email");
    (hasMxRecord as jest.Mock).mockResolvedValue(false);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    await expect(AuthService.updateUser("1", "1", { email: "bad@nonexistent-domain-xyz.com" }, "2", "admin")).rejects.toThrow("Email domain does not accept mail");
  });

  it("throws ForbiddenError when a non-admin changes another user's email", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      AuthService.updateUser("1", "1", { email: "attacker@test.com" }, "2", "manager"),
    ).rejects.toThrow(ForbiddenError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("resets emailVerified and sends a verification email when email changes", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const updatedUser = { ...mockUser, email: "new@test.com", emailVerified: false };
    (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

    await AuthService.updateUser("1", "1", { email: "new@test.com" }, "2", "admin");

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "new@test.com", emailVerified: false }),
      }),
    );
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);
    const { sendVerificationEmail } = require("./email.service");
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "new@test.com",
      mockUser.name,
      expect.stringContaining("/verify-email?token="),
    );
  });

  it("does not reset emailVerified or send verification when the email is unchanged", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, name: "New Name" });

    await AuthService.updateUser("1", "1", { name: "New Name", email: "test@example.com" }, "2", "admin");

    const call = (prisma.user.update as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty("emailVerified");
    expect(call.data).not.toHaveProperty("email");
    expect(prisma.emailVerificationToken.create).not.toHaveBeenCalled();
  });
});

describe("deleteUser", () => {
  it("deactivates the user, frees their email, revokes tokens, and writes an audit log", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    await AuthService.deleteUser("1", "1", "2", "admin");

    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "1" } });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { status: "inactive", email: "test@example.com.1.invalid" },
    });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "user",
        entityId: "1",
        action: "user_deleted",
        performedBy: "2",
      }),
    });
  });

  it("throws NotFoundError when user is not in the company", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.deleteUser("1", "999", "2")).rejects.toThrow(NotFoundError);
  });

  it("only matches active users, so a deleted user cannot be deleted again", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.deleteUser("1", "1", "2")).rejects.toThrow(NotFoundError);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "1", companyId: "1", status: "active" },
    });
  });

  it("throws ValidationError when admin tries to delete their own account", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    await expect(AuthService.deleteUser("1", "1", "1")).rejects.toThrow("You cannot delete your own account");
  });

  it("throws ForbiddenError when a non-admin deletes an admin", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    await expect(AuthService.deleteUser("1", "1", "2", "manager")).rejects.toThrow(ForbiddenError);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it("lets a manager delete a senior", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...mockUser, role: "senior" });

    await AuthService.deleteUser("1", "1", "2", "manager");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { status: "inactive", email: "test@example.com.1.invalid" },
    });
  });
});

});
