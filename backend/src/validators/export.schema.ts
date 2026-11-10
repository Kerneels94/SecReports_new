/** Report email request validation schemas. */
import { z } from "zod";

/** Emails a single incident as CSV/PDF. */
export const emailReportSchema = z.object({
  incidentId: z.string().min(1, "Incident is required"),
  email: z.string().email("Enter a valid email address"),
  format: z.enum(["csv", "pdf"], { message: "Choose CSV or PDF" }),
});

/** Emails all attempted/positive incidents as one CSV/PDF attachment. */
export const batchEmailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  type: z.enum(["attempted", "positive"], { message: "Choose attempted or positive" }),
  format: z.enum(["csv", "pdf"], { message: "Choose CSV or PDF" }),
});
