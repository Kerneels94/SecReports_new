/**
 * Patrol-report validation schemas.
 *
 * @module patrolReport.schema
 */
import { z } from "zod";

/**
 * Validates creation of a new patrol report with optional checkpoint scans.
 */
export const createPatrolReportSchema = z.object({
  siteId: z.string(),
  guardId: z.string(),
  startedAt: z.string(),
  notes: z.string().optional(),
  checkpoints: z
    .array(
      z.object({
        name: z.string().min(1),
        scannedAt: z.string(),
        status: z.enum(["ok", "missed", "late"]).default("ok"),
      }),
    )
    .optional(),
});

/**
 * Validates updates to an existing patrol report (completion, status, notes).
 */
export const updatePatrolReportSchema = z.object({
  completedAt: z.string().optional(),
  status: z.enum(["in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

/**
 * Validates creation of a single checkpoint scan entry.
 */
export const createPatrolCheckpointSchema = z.object({
  name: z.string().min(1),
  scannedAt: z.string(),
  status: z.enum(["ok", "missed", "late"]).default("ok"),
});
