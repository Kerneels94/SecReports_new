import { AuthService } from "./auth.service";
import { prisma } from "../lib/db";
import * as hash from "../lib/hash";
import * as jwt from "../lib/jwt";
import { UnauthorizedError, ConflictError } from "../lib/errors";

jest.mock("../lib/db", () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(prisma)),
  },
}));

jest.mock("../lib/hash");
jest.mock("../lib/jwt");

const mockUser = {
  id: 1,
  companyId: 1,
  name: "Test User",
  email: "test@example.com",
  passwordHash: "$2b$12$hashedpassword",
  role: "admin" as const,
  department: "IT",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCompany = {
  id: 1,
  name: "Test Company",
  email: "test@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthService", () => {
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

    it("throws for unknown email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login({ email: "unknown@example.com", password: "p" }))
        .rejects.toThrow(UnauthorizedError);
    });

    it("throws for wrong password", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hash.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login({ email: "test@example.com", password: "wrong" }))
        .rejects.toThrow(UnauthorizedError);
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

    it("throws for duplicate user email", async () => {
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
    it("creates a new user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hash.hashPassword as jest.Mock).mockResolvedValue("$2b$12$hashed");
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        companyId: 1,
        createdBy: 1,
      });

      expect(result).toEqual(expect.objectContaining({ email: "test@example.com" }));
    });

    it("throws for duplicate email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        AuthService.createUser({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          companyId: 1,
          createdBy: 1,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("getMe", () => {
    it("returns user by id", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.getMe(1);
      expect(result.email).toBe("test@example.com");
    });

    it("throws for non-existent user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.getMe(999)).rejects.toThrow(UnauthorizedError);
    });
  });
});
