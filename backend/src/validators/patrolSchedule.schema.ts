/**
 * Patrol-schedule validation schemas.
 *
 * @module patrolSchedule.schema
 */
import { z } from "zod";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const checkpointInput = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
});

/**
 * Validates creation of a new patrol schedule with optional checkpoints.
 */
export const createPatrolScheduleSchema = z.object({
  siteId: z.string().max(24),
  day: z.enum(days),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  checkpoints: z.array(checkpointInput).optional(),
}).refine((data) => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

/**
 * Validates updates to an existing patrol schedule.
 */
export const updatePatrolScheduleSchema = z.object({
  siteId: z.string().max(24).optional(),
  day: z.enum(days).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format").optional(),
  checkpoints: z.array(checkpointInput).optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) return data.startTime < data.endTime;
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});
