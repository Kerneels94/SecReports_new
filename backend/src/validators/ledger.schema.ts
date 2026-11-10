/** Ledger (financial transaction) validation schemas. */
import { z } from "zod";
import { LEDGER_ENTRY_TYPES } from "../services/ledger.service";
import { isoDate } from "./shared";

/**
 * Validates creation of a new ledger entry (superadmin only).
 */
export const createLedgerEntrySchema = z.object({
  companyId: z
    .string()
    .min(1, "Company is required")
    .max(255, "Company must be 255 characters or fewer"),
  entryType: z.enum(LEDGER_ENTRY_TYPES, { message: "Choose a valid entry type" }),
  amount: z
    .number({ message: "Amount must be a number" })
    .int("Amount must be a whole number of cents")
    .min(-2147483648, "Amount out of range")
    .max(2147483647, "Amount out of range")
    .refine((value) => value !== 0, "Amount must be non-zero"),
  currency: z
    .string()
    .min(3, "Currency must be at least 3 characters")
    .max(10, "Currency must be 10 characters or fewer")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional(),
  reference: z.string().max(100, "Reference must be 100 characters or fewer").optional(),
  postedAt: isoDate.optional(),
});

/**
 * Validates list/query filters for ledger entries.
 */
export const ledgerListQuerySchema = z.object({
  companyId: z
    .string()
    .min(1, "Company is required")
    .max(255, "Company must be 255 characters or fewer")
    .optional(),
  entryType: z
    .enum(LEDGER_ENTRY_TYPES, { message: "Choose a valid entry type" })
    .optional(),
  status: z.enum(["posted", "paid", "void"], { message: "Choose a valid status" }).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
});
