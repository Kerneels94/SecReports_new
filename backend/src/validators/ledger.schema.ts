/**
 * Ledger (financial transaction) validation schemas.
 *
 * @module ledger.schema
 */
import { z } from "zod";
import { LEDGER_ENTRY_TYPES } from "../services/ledger.service";
import { isoDate } from "./shared";

/**
 * Validates creation of a new ledger entry (superadmin only).
 */
export const createLedgerEntrySchema = z.object({
  companyId: z.string().min(1).max(255),
  entryType: z.enum(LEDGER_ENTRY_TYPES),
  amount: z
    .number()
    .int("Amount must be a whole number of cents")
    .min(-2147483648, "Amount out of range")
    .max(2147483647, "Amount out of range")
    .refine((value) => value !== 0, "Amount must be non-zero"),
  currency: z.string().min(3).max(10).optional(),
  description: z.string().max(1000).optional(),
  reference: z.string().max(100).optional(),
  postedAt: isoDate.optional(),
});

/**
 * Validates list/query filters for ledger entries.
 */
export const ledgerListQuerySchema = z.object({
  companyId: z.string().min(1).max(255).optional(),
  entryType: z.enum(LEDGER_ENTRY_TYPES).optional(),
  status: z.enum(["posted", "paid", "void"]).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
});
