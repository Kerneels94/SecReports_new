import { AuthService } from "./auth.service";
import { prisma } from "../lib/db";
import * as hash from "../lib/hash";
import * as jwt from "../lib/jwt";
import { UnauthorizedError, ConflictError, NotFoundError } from "../lib/errors";

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
      count: jest.fn().mockResolvedValue(0),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    subscriptionPlan: {
      findFirst: jest.fn().mockResolvedValue({ id: "1", name: "Free", price: 0, siteLimit: 5, userLimit: 1, trialPeriodDays: 14, features: "[]" }),
    },
    companySubscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "1", companyId: "1", planId: "1", status: "active" }),
    },
    $transaction: jest.fn((fn: any) => fn(prisma)),
  },
}));

jest.mock("../lib/hash");
jest.mock("../lib/jwt");
jest.mock("./email.service", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockUser = {
  id: "1",
  companyId: "1",
  name: "Test User",
  email: "test@example.com",
  passwordHash: "$2b$12$hashedpassword",
  role: "owner",
  status: "active",
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
        refreshToken: "refresh-token",
        user: expect.objectContaining({ email: "test@example.com" }),
      });
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
  });

  describe("refresh", () => {
    it("returns new tokens for valid refresh token", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", role: "owner", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwt.signAccessToken as jest.Mock).mockReturnValue("new-access-token");
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("new-refresh-token");

      const result = await AuthService.refresh("valid-refresh-token");

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
    });

    it("throws UnauthorizedError for invalid refresh token", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new Error("invalid");
      });

      await expect(AuthService.refresh("bad-token")).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when user from token no longer exists", async () => {
      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "999", role: "owner", companyId: "1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.refresh("token-for-deleted-user")).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("register", () => {
    it("creates a company and admin user and returns tokens", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);
      (hash.hashPassword as jest.Mock).mockResolvedValue("$2b$12$hashed");
      (prisma.company.create as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.signAccessToken as jest.Mock).mockReturnValue("access-token");
      (jwt.signRefreshToken as jest.Mock).mockReturnValue("refresh-token");

      const result = await AuthService.register({
        companyName: "Test Company",
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: expect.objectContaining({ email: "test@example.com" }),
        company: expect.objectContaining({ name: "Test Company" }),
      });
    });

    it("throws ConflictError for duplicate user email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        AuthService.register({
          companyName: "Test Company",
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      ).rejects.toThrow(ConflictError);
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
        data: { passwordHash: "$2b$12$newhashed" },
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
  it("changes password when current password is correct", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (hash.comparePassword as jest.Mock).mockResolvedValue(true);
    (hash.hashPassword as jest.Mock).mockResolvedValue("$2b$12$newhash");

    await AuthService.changePassword("1", "current-password", "new-password");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { passwordHash: "$2b$12$newhash" },
    });
  });

  it("throws UnauthorizedError when user not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.changePassword("1", "current", "new")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when current password is incorrect", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (hash.comparePassword as jest.Mock).mockResolvedValue(false);

    await expect(AuthService.changePassword("1", "wrong", "new")).rejects.toThrow(UnauthorizedError);
  });
});

describe("listUsers", () => {
  it("returns all users for the company", async () => {
    const users = [
      { id: "1", name: "User A", email: "a@test.com", role: "senior", status: "active", createdAt: new Date() },
      { id: "2", name: "User B", email: "b@test.com", role: "owner", status: "active", createdAt: new Date() },
    ];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

    const result = await AuthService.listUsers("1");

    expect(result).toEqual(users);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { companyId: "1" },
      select: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("getUserById", () => {
  it("returns user when found in same company", async () => {
    const user = {
      id: "1", name: "Test User", email: "test@example.com", role: "owner",
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

    const result = await AuthService.updateUser("1", "1", { name: "Updated Name", email: "updated@test.com", role: "manager" });

    expect(result.name).toBe("Updated Name");
  });

  it("throws NotFoundError when user not in company", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.updateUser("1", "999", { name: "New" })).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when email already in use", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, id: "2", email: "other@test.com" });

    await expect(AuthService.updateUser("1", "1", { email: "other@test.com" })).rejects.toThrow(ConflictError);
  });
});

});
