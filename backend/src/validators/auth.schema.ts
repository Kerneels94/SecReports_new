/**
 * Authentication request/response validation schemas.
 *
 * @module auth.schema
 */
import { z } from "zod";

/**
 * Validates company/employee sign-in credentials.
 */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Validates employee-specific sign-in credentials.
 */
export const employeeLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Validates refresh-token rotation requests.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Validates new company registration payloads.
 */
export const registerSchema = z.object({
  companyName: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Validates admin-created user accounts within a company.
 */
export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["owner", "manager", "senior"]).optional(),
});

/**
 * Validates forgot-password email submissions.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * Validates password-reset completion payloads (token + new password).
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

/**
 * Validates authenticated password-change requests.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/**
 * Validates user-profile update payloads.
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(["owner", "manager", "senior"]).optional(),
});
