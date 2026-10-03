/**
 * Contact routes — public landing-page enquiry form.
 * Forwards the submission to the support inbox as a branded email with the
 * sender set as Reply-To. Rate limited because it is unauthenticated and
 * sends mail on every accepted request.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sendMail } from "../services/email.service";
import { contactSchema } from "../validators/contact.schema";
import { ValidationError } from "../lib/errors";

const CONTACT_INBOX = process.env.FROM_EMAIL || "support@secreports.co.za";

/** Validates a contact submission and emails it to the support inbox. */
export async function submitContact(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = contactSchema.safeParse(request.body);
  if (!parsed.success)
    throw new ValidationError("Invalid input", parsed.error.flatten());

  const { name, email, company, message } = parsed.data;

  const { error } = await sendMail({
    to: CONTACT_INBOX,
    subject: "contact",
    replyTo: email,
    data: { name, email, company, message },
  });

  if (error) {
    request.log.error({ error }, "Contact enquiry email failed to send");
    throw new Error("Failed to deliver contact enquiry");
  }

  reply.code(200).send({
    success: true,
    message: "Thanks — your message has been sent to our team.",
  });
}

export default async function contactRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/contact",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    submitContact,
  );
}