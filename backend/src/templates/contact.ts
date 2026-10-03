/**
 * Email template for a landing-page contact form submission, forwarded to support.
 * Every field here is untrusted public input, so all values are HTML-escaped
 * before they are rendered into the email body.
 *
 * @module contact
 */
import { BRAND, emailLayout, paragraph, detailCard, mutedNote } from "./layout";
import { escapeHtml } from "./escape";

export interface ContactSubmission {
  name: string;
  email: string;
  company?: string;
  message: string;
}

/** Renders the enquiry details card, replacing a blank company with a placeholder. */
export default function contactTemplate(data: ContactSubmission): string {
  const body = `
    ${paragraph("A new enquiry was submitted through the <strong>SecReports</strong> website contact form.")}
    ${detailCard([
      { label: "Name", value: escapeHtml(data.name) },
      { label: "Email", value: escapeHtml(data.email) },
      {
        label: "Company",
        value: data.company ? escapeHtml(data.company) : "Not provided",
      },
    ])}
    <div style="background: ${BRAND.background}; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px;">
      <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: ${BRAND.navy}; text-transform: uppercase; letter-spacing: 0.3px;">Message</p>
      <p style="margin: 0; font-size: 15px; color: ${BRAND.body}; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">${escapeHtml(data.message)}</p>
    </div>
    ${mutedNote("Reply directly to this email to respond to the sender.")}
  `;

  return emailLayout({
    title: "New Website Enquiry",
    body,
    footerNote: "Submitted from the SecReports website contact form.",
  });
}