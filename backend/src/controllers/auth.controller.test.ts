import { AuthController } from "./auth.controller";
import { AuthService } from "../services/auth.service";
import { ValidationError } from "../lib/errors";

jest.mock("../services/auth.service", () => ({
  AuthService: {
    login: jest.fn(),
    refresh: jest.fn(),
    getMe: jest.fn(),
    register: jest.fn(),
    createUser: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    listUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    listSessions: jest.fn(),
  },
}));

jest.mock("../validators/auth.schema", () => ({
  loginSchema: { safeParse: jest.fn() },
  registerSchema: { safeParse: jest.fn() },
  createUserSchema: { safeParse: jest.fn() },
  forgotPasswordSchema: { safeParse: jest.fn() },
  resetPasswordSchema: { safeParse: jest.fn() },
  changePasswordSchema: { safeParse: jest.fn() },
  updateUserSchema: { safeParse: jest.fn() },
}));

import {
  loginSchema,
  registerSchema,
  createUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateUserSchema,
} from "../validators/auth.schema";

describe("AuthController", () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      user: { userId: "1", companyId: "1", role: "admin" },
      headers: { "user-agent": "test-agent" },
      cookies: {},
      body: {},
    };
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setCookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe("login", () => {
    it("valid input: calls AuthService.login and responds 200", async () => {
      const body = { email: "test@test.com", password: "secret" };
      mockRequest.body = body;
      (loginSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: body });
      (AuthService.login as jest.Mock).mockResolvedValue({ accessToken: "at", refreshToken: "rt", user: { id: "1" } });

      await AuthController.login(mockRequest, mockReply);

      expect(AuthService.login).toHaveBeenCalledWith({ ...body, deviceInfo: "test-agent" });
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: expect.any(Object) });
    });

    it("invalid input: throws ValidationError", async () => {
      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: { email: ["Invalid email"] } }) },
      });

      await expect(AuthController.login(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });

    // Golden rule #28: the refresh cookie must be SameSite=Strict regardless
    // of environment to prevent CSRF on /auth/refresh and /auth/logout.
    it("sets the refresh cookie as SameSite=Strict, Secure, and HttpOnly", async () => {
      const body = { email: "test@test.com", password: "secret" };
      mockRequest.body = body;
      (loginSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: body });
      (AuthService.login as jest.Mock).mockResolvedValue({ accessToken: "at", refreshToken: "rt", user: { id: "1" } });

      await AuthController.login(mockRequest, mockReply);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        "refreshToken",
        "rt",
        expect.objectContaining({ sameSite: "strict", secure: true, httpOnly: true, path: "/" }),
      );
    });
  });

  describe("refresh", () => {
    it("valid input from cookie: calls AuthService.refresh and responds 200", async () => {
      mockRequest.cookies = { refreshToken: "cookie-token" };
      (AuthService.refresh as jest.Mock).mockResolvedValue({ accessToken: "at", refreshToken: "rt" });

      await AuthController.refresh(mockRequest, mockReply);

      expect(AuthService.refresh).toHaveBeenCalledWith("cookie-token", "test-agent");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("throws ValidationError when no refresh token provided", async () => {
      await expect(AuthController.refresh(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("me", () => {
    it("calls AuthService.getMe with userId and responds 200", async () => {
      (AuthService.getMe as jest.Mock).mockResolvedValue({ id: "1", name: "Test User" });

      await AuthController.me(mockRequest, mockReply);

      expect(AuthService.getMe).toHaveBeenCalledWith("1");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: { id: "1", name: "Test User" } });
    });
  });

  describe("register", () => {
    const validBody = {
      companyName: "Test Co",
      name: "Test",
      email: "test@test.com",
      password: "password123",
    };

    it("valid input: calls AuthService.register and responds 201", async () => {
      mockRequest.body = validBody;
      (registerSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: validBody });
      (AuthService.register as jest.Mock).mockResolvedValue({ accessToken: "at", refreshToken: "rt" });

      await AuthController.register(mockRequest, mockReply);

      expect(AuthService.register).toHaveBeenCalledWith(validBody);
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });

    it("invalid input: throws ValidationError", async () => {
      (registerSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({}) },
      });

      await expect(AuthController.register(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("createUser", () => {
    const validBody = { name: "New", email: "new@test.com", password: "password123" };

    it("valid input: calls service with companyId and createdBy, responds 201", async () => {
      mockRequest.body = validBody;
      (createUserSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: validBody });
      (AuthService.createUser as jest.Mock).mockResolvedValue({ id: "2", name: "New" });

      await AuthController.createUser(mockRequest, mockReply);

      expect(AuthService.createUser).toHaveBeenCalledWith({ ...validBody, companyId: "1", createdBy: "1" });
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });

    it("invalid input: throws ValidationError", async () => {
      (createUserSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({}) },
      });

      await expect(AuthController.createUser(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("forgotPassword", () => {
    it("valid input: calls AuthService.forgotPassword and always responds 200", async () => {
      mockRequest.body = { email: "test@test.com" };
      (forgotPasswordSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: { email: "test@test.com" } });
      (AuthService.forgotPassword as jest.Mock).mockResolvedValue(undefined);

      await AuthController.forgotPassword(mockRequest, mockReply);

      expect(AuthService.forgotPassword).toHaveBeenCalledWith("test@test.com");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("invalid input: throws ValidationError", async () => {
      (forgotPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({}) },
      });

      await expect(AuthController.forgotPassword(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("resetPassword", () => {
    it("valid input: calls AuthService.resetPassword and responds 200", async () => {
      mockRequest.body = { token: "abc123", password: "newpassword123" };
      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { token: "abc123", password: "newpassword123" },
      });
      (AuthService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      await AuthController.resetPassword(mockRequest, mockReply);

      expect(AuthService.resetPassword).toHaveBeenCalledWith("abc123", "newpassword123");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("invalid input: throws ValidationError", async () => {
      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({}) },
      });

      await expect(AuthController.resetPassword(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("changePassword", () => {
    it("valid input: calls AuthService.changePassword and responds 200", async () => {
      mockRequest.body = { currentPassword: "oldpw", newPassword: "newpassword123" };
      (changePasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { currentPassword: "oldpw", newPassword: "newpassword123" },
      });
      (AuthService.changePassword as jest.Mock).mockResolvedValue(undefined);

      await AuthController.changePassword(mockRequest, mockReply);

      expect(AuthService.changePassword).toHaveBeenCalledWith("1", "oldpw", "newpassword123");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("invalid input: throws ValidationError", async () => {
      (changePasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { issues: [{ message: "Password must be at least 8 characters" }], flatten: () => ({}) },
      });

      await expect(AuthController.changePassword(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("listUsers", () => {
    it("calls AuthService.listUsers and responds 200", async () => {
      const users = [{ id: "1", name: "User" }];
      (AuthService.listUsers as jest.Mock).mockResolvedValue(users);

      await AuthController.listUsers(mockRequest, mockReply);

      expect(AuthService.listUsers).toHaveBeenCalledWith("1");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: users });
    });
  });

  describe("getUserById", () => {
    it("calls AuthService.getUserById and responds 200", async () => {
      mockRequest.params = { id: "1" };
      const user = { id: "1", name: "Test User" };
      (AuthService.getUserById as jest.Mock).mockResolvedValue(user);

      await AuthController.getUserById(mockRequest, mockReply);

      expect(AuthService.getUserById).toHaveBeenCalledWith("1", "1");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: user });
    });
  });

  describe("updateUser", () => {
    it("valid input: calls AuthService.updateUser and responds 200", async () => {
      mockRequest.params = { id: "2" };
      mockRequest.body = { name: "Updated" };
      (updateUserSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { name: "Updated" },
      });
      (AuthService.updateUser as jest.Mock).mockResolvedValue({ id: "2", name: "Updated" });

      await AuthController.updateUser(mockRequest, mockReply);

      expect(AuthService.updateUser).toHaveBeenCalledWith("1", "2", { name: "Updated" }, "1", "admin");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("invalid input: throws ValidationError", async () => {
      mockRequest.params = { id: "1" };
      (updateUserSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({}) },
      });

      await expect(AuthController.updateUser(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("deleteUser", () => {
    it("calls AuthService.deleteUser and responds 200", async () => {
      mockRequest.params = { id: "2" };
      (AuthService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await AuthController.deleteUser(mockRequest, mockReply);

      expect(AuthService.deleteUser).toHaveBeenCalledWith("1", "2", "1");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, message: "User deleted successfully." });
    });
  });

  describe("logout", () => {
    it("valid input from cookie: calls AuthService.logout and responds 200", async () => {
      mockRequest.cookies = { refreshToken: "cookie-token" };

      await AuthController.logout(mockRequest, mockReply);

      expect(AuthService.logout).toHaveBeenCalledWith("cookie-token");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, message: "Logged out successfully." });
    });

    it("throws ValidationError when no refresh token provided", async () => {
      await expect(AuthController.logout(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("logoutAll", () => {
    it("calls AuthService.logoutAll and responds 200", async () => {
      await AuthController.logoutAll(mockRequest, mockReply);

      expect(AuthService.logoutAll).toHaveBeenCalledWith("1");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, message: "All sessions logged out." });
    });
  });

  describe("listSessions", () => {
    it("calls AuthService.listSessions and responds 200", async () => {
      const sessions = [{ id: "s1", deviceInfo: null, createdAt: new Date(), expiresAt: new Date() }];
      (AuthService.listSessions as jest.Mock).mockResolvedValue(sessions);

      await AuthController.listSessions(mockRequest, mockReply);

      expect(AuthService.listSessions).toHaveBeenCalledWith("1");
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: sessions });
    });
  });
});
