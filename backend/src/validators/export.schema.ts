/** Report email request validation schemas. */
import { z } from "zod";
import { newEmail } from "./shared";

// Recipients use `newEmail` so reports are not sent to typed-at-random
// addresses; the controller also checks the domain's MX record.

/** Emails a single incident as CSV/PDF. */
export const emailReportSchema = z.object({
  incidentId: z.string().min(1, "Incident is required"),
  email: newEmail,
  format: z.enum(["csv", "pdf"], { message: "Choose CSV or PDF" }),
});

/** Emails all attempted/positive incidents as one CSV/PDF attachment. */
export const batchEmailSchema = z.object({
  email: newEmail,
  type: z.enum(["attempted", "positive"], { message: "Choose attempted or positive" }),
  format: z.enum(["csv", "pdf"], { message: "Choose CSV or PDF" }),
});
