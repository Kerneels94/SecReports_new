/**
 * Invoice request validation schemas.
 *
 * @module invoice.schema
 */
import { z } from "zod";

const MAX_INT32 = 2_147_483_647;

/** Validates an admin-created invoice payload (amount is in cents). */
export const createInvoiceSchema = z.object({
  companyId: z.string().min(1),
  amount: z.number().int().positive().max(MAX_INT32),
  currency: z.string().min(1).max(10).optional(),
  dueDate: z.coerce.date(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  description: z.string().max(1000).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
