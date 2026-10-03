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
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().trim().email("Invalid email address").max(255),
  company: z.string().trim().max(255).optional(),
  message: z.string().trim().min(1, "Message is required").max(5000),
});