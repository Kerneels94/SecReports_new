/**
 * Invoice request validation schemas.
 *
 * @module invoice.schema
 */
import { z } from "zod";

const MAX_INT32 = 2_147_483_647;

// Dates arrive as ISO strings over JSON. z.coerce.date alone turns null and 0
// into the epoch, so validate the shape first and only then coerce.
const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
};
// PR #127 review: a garbage date used to say "Due date is required", which
// misled users who had typed something. Blank input means missing; anything
// else that is not a date means invalid.
const isBlank = (value: unknown) =>
  value === undefined || value === null || value === "" || value === 0;
const requiredDate = (missing: string, invalid: string) =>
  z.preprocess(
    (value) => toDate(value) ?? value,
    z.date({ error: (issue) => (isBlank(issue.input) ? missing : invalid) }),
  );
const optionalDate = (message: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return undefined;
      return toDate(value) ?? value;
    },
    z.date({ message }).optional(),
  );

/** Validates an admin-created invoice payload (amount is in cents). */
export const createInvoiceSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  amount: z
    .number({ message: "Amount must be a number" })
    .int("Amount must be a whole number of cents")
    .positive("Amount must be greater than zero")
    .max(MAX_INT32, "Amount is too large"),
  currency: z.string().min(1, "Currency is required").max(10, "Currency must be 10 characters or fewer").optional(),
  dueDate: requiredDate("Due date is required", "Due date must be a valid date"),
  periodStart: optionalDate("Period start must be a valid date"),
  periodEnd: optionalDate("Period end must be a valid date"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
