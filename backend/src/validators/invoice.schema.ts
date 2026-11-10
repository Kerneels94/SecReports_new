/**
 * Invoice request validation schemas.
 *
 * @module invoice.schema
 */
import { z } from "zod";

const MAX_INT32 = 2_147_483_647;

/** Validates an admin-created invoice payload (amount is in cents). */
export const createInvoiceSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  amount: z
    .number({ message: "Amount must be a number" })
    .int("Amount must be a whole number of cents")
    .positive("Amount must be greater than zero")
    .max(MAX_INT32, "Amount is too large"),
  currency: z.string().min(1, "Currency is required").max(10, "Currency must be 10 characters or fewer").optional(),
  dueDate: z.coerce.date({ message: "Due date is required" }),
  periodStart: z.coerce.date({ message: "Period start must be a valid date" }).optional(),
  periodEnd: z.coerce.date({ message: "Period end must be a valid date" }).optional(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
