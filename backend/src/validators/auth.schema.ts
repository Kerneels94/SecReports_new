/**
 * Authentication request/response validation schemas.
 *
 * @module auth.schema
 */
import { z } from "zod";
import { newEmail } from "./shared";

// The message on z.string() covers an omitted field: without it the type
// check fails before .min() runs and the client sees a raw type error.
const strongPassword = z
  .string("Password is required")
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

/**
 * Validates company/employee sign-in credentials.
 * Deliberately not `newEmail`: existing accounts must never be locked out
 * by the gibberish heuristic. Same for forgotPasswordSchema.
 */
export const loginSchema = z.object({
  email: z
    .string("Email is required")
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  password: z.string("Password is required").min(1, "Password is required"),
});

/**
 * Validates new company registration payloads.
 */
export const registerSchema = z.object({
  companyName: z
    .string("Company name is required")
    .min(1, "Company name is required")
    .max(255, "Company name must be 255 characters or fewer"),
  name: z
    .string("Name is required")
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  // newEmail adds the gibberish check; only new or changed addresses use it.
  email: newEmail,
  password: strongPassword,
});

/**
 * Validates admin-created user accounts within a company.
 */
export const createUserSchema = z.object({
  name: z
    .string("Name is required")
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  surname: z.string().max(255, "Surname must be 255 characters or fewer").optional(),
  email: newEmail,
  password: strongPassword,
  role: z.enum(["admin", "manager", "senior"], {
    message: "Choose a valid role",
  }).optional(),
});

/**
 * Validates forgot-password email submissions.
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string("Email is required")
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
});

/**
 * Validates email-verification token submissions.
 */
export const verifyEmailSchema = z.object({
  token: z.string("Verification token is required").min(1, "Verification token is required"),
});

/**
 * Validates password-reset completion payloads (token + new password).
 */
export const resetPasswordSchema = z.object({
  token: z.string("Reset token is required").min(1, "Reset token is required"),
  password: strongPassword,
});

/**
 * Validates authenticated password-change requests.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string("Current password is required").min(1, "Current password is required"),
  newPassword: strongPassword,
});

/**
 * Validates user-profile update payloads.
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer")
    .optional(),
  surname: z.string().max(255, "Surname must be 255 characters or fewer").optional(),
  email: newEmail.optional(),
  role: z
    .enum(["admin", "manager", "senior"], { message: "Choose a valid role" })
    .optional(),
});
