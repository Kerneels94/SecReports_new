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

const timeSlotInput = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  order: z.number().int().min(0).optional(),
  checkpoints: z.array(checkpointInput).optional(),
}).refine((data) => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

/**
 * Validates creation of a new patrol schedule with time slots and checkpoints.
 */
export const createPatrolScheduleSchema = z.object({
  siteId: z.string().max(24),
  day: z.enum(days),
  timeSlots: z.array(timeSlotInput).min(1, "At least one time slot is required"),
});

/**
 * Validates updates to an existing patrol schedule.
 */
export const updatePatrolScheduleSchema = z.object({
  siteId: z.string().max(24).optional(),
  day: z.enum(days).optional(),
  timeSlots: z.array(timeSlotInput).optional(),
});
