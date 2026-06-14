/**
 * Entry-log (gate register) validation schemas.
 *
 * @module entryLog.schema
 */
import { z } from "zod";

/**
 * Validates creation of a new entry-log record.
 */
export const createEntryLogSchema = z.object({
  siteId: z.string(),
  guardId: z.string().optional(),
  driverName: z.string().min(1).max(255),
  driverContact: z.string().max(20).optional(),
  vehicleReg: z.string().min(1).max(50),
  vehicleDesc: z.string().max(255).optional(),
  entryTime: z.string(),
  purpose: z.string().max(500).optional(),
});

/**
 * Validates updates to an existing entry-log record.
 */
export const updateEntryLogSchema = z.object({
  exitTime: z.string().optional(),
  driverName: z.string().min(1).max(255).optional(),
  driverContact: z.string().max(20).optional(),
  vehicleDesc: z.string().max(255).optional(),
  purpose: z.string().max(500).optional(),
});

/**
 * Validates manual vehicle-flagging via an entry-log.
 */
export const flagVehicleSchema = z.object({
  vehicleReg: z.string().min(1).max(50),
  reason: z.string().min(1),
});
