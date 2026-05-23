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
  },
}));

jest.mock("../validators/auth.schema", () => ({
  loginSchema: { safeParse: jest.fn() },
  refreshSchema: { safeParse: jest.fn() },
  registerSchema: { safeParse: jest.fn() },
  createUserSchema: { safeParse: jest.fn() },
  forgotPasswordSchema: { safeParse: jest.fn() },
  resetPasswordSchema: { safeParse: jest.fn() },
}));

import {
  loginSchema,
  refreshSchema,
  registerSchema,
  createUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.schema";

describe("AuthController", () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      user: { userId: 1, companyId: 1, role: "admin" },
      body: {},
    };
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  describe("login", () => {
    it("valid input: calls AuthService.login and responds 200", async () => {
      const body = { email: "test@test.com", password: "secret" };
      mockRequest.body = body;
      (loginSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: body });
      (AuthService.login as jest.Mock).mockResolvedValue({ accessToken: "at", refreshToken: "rt", user: { id: 1 } });

      await AuthController.login(mockRequest, mockReply);

      expect(AuthService.login).toHaveBeenCalledWith(body);
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
  });

  describe("refresh", () => {
    it("valid input: calls AuthService.refresh and responds 200", async () => {
      mockRequest.body = { refreshToken: "some-token" };
      (refreshSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: { refreshToken: "some-token" } });
      (AuthService.refresh as jest.Mock).mockResolvedValue({ accessToken: "at", refreshToken: "rt" });

      await AuthController.refresh(mockRequest, mockReply);

      expect(AuthService.refresh).toHaveBeenCalledWith("some-token");
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it("invalid input: throws ValidationError", async () => {
      (refreshSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({}) },
      });

      await expect(AuthController.refresh(mockRequest, mockReply)).rejects.toThrow(ValidationError);
    });
  });

  describe("me", () => {
    it("calls AuthService.getMe with userId and responds 200", async () => {
      (AuthService.getMe as jest.Mock).mockResolvedValue({ id: 1, name: "Test User" });

      await AuthController.me(mockRequest, mockReply);

      expect(AuthService.getMe).toHaveBeenCalledWith(1);
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, data: { id: 1, name: "Test User" } });
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
      (AuthService.createUser as jest.Mock).mockResolvedValue({ id: 2, name: "New" });

      await AuthController.createUser(mockRequest, mockReply);

      expect(AuthService.createUser).toHaveBeenCalledWith({ ...validBody, companyId: 1, createdBy: 1 });
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
});
