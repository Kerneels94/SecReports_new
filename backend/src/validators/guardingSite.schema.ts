/**
 * Guarding-site validation schemas.
 *
 * @module guardingSite.schema
 */
import { z } from "zod";

/**
 * Validates individual guard data when creating guards inline with a site.
 */
const guardInputSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  cellphone: z.string().min(1),
  employeeId: z.string().min(1),
});

/**
 * Validates creation of a new guarding site (optionally with guards).
 */
export const createGuardingSiteSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(500).optional(),
  guards: z.array(guardInputSchema).optional(),
});

/**
 * Validates updates to an existing guarding site.
 */
export const updateGuardingSiteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  newGuards: z.array(guardInputSchema).optional(),
  removeGuardIds: z.array(z.string()).optional(),
});
