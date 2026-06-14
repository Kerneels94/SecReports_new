/**
 * Flagged-vehicle validation schemas.
 *
 * @module flaggedVehicle.schema
 */
import { z } from "zod";

/**
 * Validates creation of a new flagged-vehicle record.
 */
export const createFlaggedVehicleSchema = z.object({
  vehicleReg: z.string().min(1).max(50),
  reason: z.string().min(1),
  entryLogId: z.string().optional(),
});

/**
 * Validates resolution of a flagged vehicle (empty body, acts as a marker).
 */
export const resolveFlaggedVehicleSchema = z.object({});
