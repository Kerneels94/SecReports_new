/**
 * Authentication request/response validation schemas.
 *
 * @module auth.schema
 */
import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

/**
 * Validates company/employee sign-in credentials.
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

/**
 * Validates new company registration payloads.
 */
export const registerSchema = z.object({
  companyName: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  email: z.string().trim().toLowerCase().email(),
  password: strongPassword,
});

/**
 * Validates admin-created user accounts within a company.
 */
export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  surname: z.string().max(255).optional(),
  email: z.string().trim().toLowerCase().email(),
  password: strongPassword,
  role: z.enum(["admin", "manager", "senior"]).optional(),
});

/**
 * Validates forgot-password email submissions.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Validates email-verification token submissions.
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

/**
 * Validates password-reset completion payloads (token + new password).
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: strongPassword,
});

/**
 * Validates authenticated password-change requests.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPassword,
});

/**
 * Validates user-profile update payloads.
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  surname: z.string().max(255).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(["admin", "manager", "senior"]).optional(),
});
