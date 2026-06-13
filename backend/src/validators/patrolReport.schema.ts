import { z } from "zod";

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

export const updatePatrolReportSchema = z.object({
  completedAt: z.string().optional(),
  status: z.enum(["in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export const createPatrolCheckpointSchema = z.object({
  name: z.string().min(1),
  scannedAt: z.string(),
  status: z.enum(["ok", "missed", "late"]).default("ok"),
});
