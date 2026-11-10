/**
 * Contact form validation schema for the public landing-page enquiry form.
 *
 * @module contact.schema
 */
import { z } from "zod";

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
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255, "Email must be 255 characters or fewer"),
  company: z.string().trim().max(255, "Company must be 255 characters or fewer").optional(),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(5000, "Message must be 5000 characters or fewer"),
});
