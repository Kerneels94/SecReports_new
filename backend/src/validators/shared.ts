/** Shared Zod refinements reused across validators. */
import { z } from "zod";

/** Accepts any string Date.parse() can turn into a valid date. */
export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date",
  });
