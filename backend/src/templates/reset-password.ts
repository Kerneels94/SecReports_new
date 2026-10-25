/**
 * Email template sent to a user requesting a password reset.
 *
 * @module reset-password
 */
import { emailLayout, greeting, paragraph, ctaButton, mutedNote } from "./layout";

export default function resetPasswordTemplate(name: string, resetLink: string): string {
  const body = `
        ${greeting(name)}
        ${paragraph("We received a request to reset the password for your SecReports account.")}
        ${ctaButton(resetLink, "Reset Your Password")}
        ${mutedNote("This link will expire in <strong>15 minutes</strong>.")}
        ${mutedNote("If you did not request a password reset, please ignore this email.")}
      `;

  return emailLayout({ title: "Reset Your Password", body });
}