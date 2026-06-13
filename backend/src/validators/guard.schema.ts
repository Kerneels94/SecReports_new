import { z } from "zod";

export const createGuardSchema = z.object({
  name: z.string().min(1).max(255),
  surname: z.string().min(1).max(255),
  cellphone: z.string().min(1).max(20),
  email: z.string().email(),
  employeeId: z.string().min(1).max(100),
  siteId: z.string().optional(),
  password: z.string().min(6),
});

export const updateGuardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  surname: z.string().min(1).max(255).optional(),
  cellphone: z.string().min(1).max(20).optional(),
  email: z.string().email().optional(),
  employeeId: z.string().min(1).max(100).optional(),
  siteId: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
});
