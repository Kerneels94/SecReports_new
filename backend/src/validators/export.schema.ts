/** Report email request validation schemas. */
import { z } from "zod";

/** Emails a single incident as CSV/PDF. */
export const emailReportSchema = z.object({
  incidentId: z.string().min(1),
  email: z.string().email(),
  format: z.enum(["csv", "pdf"]),
});

/** Emails all attempted/positive incidents as one CSV/PDF attachment. */
export const batchEmailSchema = z.object({
  email: z.string().email(),
  type: z.enum(["attempted", "positive"]),
  format: z.enum(["csv", "pdf"]),
});
