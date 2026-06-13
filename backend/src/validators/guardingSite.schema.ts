import { z } from "zod";

const guardInputSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  cellphone: z.string().min(1),
  email: z.string().email().optional(),
  employeeId: z.string().min(1),
  password: z.string().min(6),
});

export const createGuardingSiteSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(500).optional(),
  guards: z.array(guardInputSchema).optional(),
});

export const updateGuardingSiteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
