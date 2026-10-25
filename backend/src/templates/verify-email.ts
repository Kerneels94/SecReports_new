/**
 * Email template sent to a new user requesting email verification.
 *
 * @module verify-email
 */
import { emailLayout, greeting, paragraph, ctaButton, mutedNote } from "./layout";

export default function verifyEmailTemplate(name: string, verifyLink: string): string {
  const body = `
        ${greeting(name)}
        ${paragraph("Thank you for creating a SecReports account. Please verify your email address by clicking the button below.")}
        ${ctaButton(verifyLink, "Verify Email Address")}
        ${mutedNote("This link will expire in <strong>1 hour</strong>.")}
        ${mutedNote("If you did not create this account, please disregard this email.")}
      `;

  return emailLayout({ title: "Verify Your Email", body });
}