/**
 * Email template notifying the application owner when a new company
 * self-registers on the platform.
 *
 * Every field here is untrusted public input, so all values are HTML-escaped
 * before they are rendered into the email body.
 *
 * @module new-company
 */
import { emailLayout, paragraph, detailCard, mutedNote } from "./layout";
import { escapeHtml } from "./escape";

export default function newCompanyTemplate(
  companyName: string,
  adminName: string,
  adminEmail: string,
): string {
  const body = `
    ${paragraph("A new company has just registered on <strong>SecReports</strong>.")}
    ${detailCard([
      { label: "Company", value: escapeHtml(companyName) },
      { label: "Admin", value: `${escapeHtml(adminName)} (${escapeHtml(adminEmail)})` },
    ])}
    ${mutedNote("This is an automated notification. No action is required unless the registration looks suspicious.")}
  `;

  return emailLayout({ title: "New Company Registered", body });
}