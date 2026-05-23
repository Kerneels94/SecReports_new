import {
  loginSchema,
  refreshSchema,
  registerSchema,
  createUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema";

describe("auth schemas", () => {
  describe("loginSchema", () => {
    it("passes for valid email and password", () => {
      const result = loginSchema.safeParse({ email: "test@test.com", password: "secret" });
      expect(result.success).toBe(true);
    });

    it("fails when email is missing", () => {
      const result = loginSchema.safeParse({ password: "secret" });
      expect(result.success).toBe(false);
    });

    it("fails for invalid email format", () => {
      const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
      expect(result.success).toBe(false);
    });

    it("fails for empty password", () => {
      const result = loginSchema.safeParse({ email: "test@test.com", password: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("refreshSchema", () => {
    it("passes for non-empty token", () => {
      const result = refreshSchema.safeParse({ refreshToken: "some-token" });
      expect(result.success).toBe(true);
    });

    it("fails for empty token", () => {
      const result = refreshSchema.safeParse({ refreshToken: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    const valid = { companyName: "Co", name: "T", email: "t@t.com", password: "password123" };

    it("passes for valid data", () => {
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails for password shorter than 8 characters", () => {
      const result = registerSchema.safeParse({ ...valid, password: "1234567" });
      expect(result.success).toBe(false);
    });

    it("fails when fields are missing", () => {
      const result = registerSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createUserSchema", () => {
    const valid = { name: "Test", email: "t@t.com", password: "password123" };

    it("passes for valid required fields", () => {
      const result = createUserSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("passes with all optional fields", () => {
      const result = createUserSchema.safeParse({
        ...valid,
        role: "investigator",
        department: "IT",
      });
      expect(result.success).toBe(true);
    });

    it("fails for invalid role value", () => {
      const result = createUserSchema.safeParse({ ...valid, role: "superadmin" });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("passes for valid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "test@test.com" });
      expect(result.success).toBe(true);
    });

    it("fails for invalid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "bad" });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("passes for valid token and password", () => {
      const result = resetPasswordSchema.safeParse({ token: "abc123", password: "password123" });
      expect(result.success).toBe(true);
    });

    it("fails for short password", () => {
      const result = resetPasswordSchema.safeParse({ token: "abc123", password: "1234567" });
      expect(result.success).toBe(false);
    });
  });
});
