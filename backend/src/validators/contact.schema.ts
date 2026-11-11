/**
 * Contact form validation schema for the public landing-page enquiry form.
 *
 * @module contact.schema
 */
import { z } from "zod";
import { newEmail } from "./shared";

/**
 * Validates a contact form submission. Length caps keep the enquiry email
 * within sane limits for the support inbox.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  // Shared rule: trims, lowercases, caps at 255 and rejects gibberish.
  email: newEmail,
  company: z.string().trim().max(255, "Company must be 255 characters or fewer").optional(),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(5000, "Message must be 5000 characters or fewer"),
});
