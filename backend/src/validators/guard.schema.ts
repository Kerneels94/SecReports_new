/**
 * Guard (security officer) validation schemas.
 *
 * @module guard.schema
 */
import { z } from "zod";

/**
 * Validates creation of a new guard.
 */
export const createGuardSchema = z.object({
  name: z.string().min(1).max(255),
  surname: z.string().min(1).max(255),
  cellphone: z.string().min(1).max(20),
  employeeId: z.string().min(1).max(100),
  siteId: z.string().optional(),
});

/**
 * Validates updates to an existing guard's details.
 */
export const updateGuardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  surname: z.string().min(1).max(255).optional(),
  cellphone: z.string().min(1).max(20).optional(),
  employeeId: z.string().min(1).max(100).optional(),
  siteId: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
});
