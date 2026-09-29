/**
 * Email template notifying the application owner when a new company
 * self-registers on the platform.
 *
 * @module new-company
 */
import { emailLayout, paragraph, detailCard, mutedNote } from "./layout";

export default function newCompanyTemplate(
  companyName: string,
  adminName: string,
  adminEmail: string,
): string {
  const body = `
    ${paragraph("A new company has just registered on <strong>SecReports</strong>.")}
    ${detailCard([
      { label: "Company", value: companyName },
      { label: "Admin", value: `${adminName} (${adminEmail})` },
    ])}
    ${mutedNote("This is an automated notification. No action is required unless the registration looks suspicious.")}
  `;

  return emailLayout({ title: "New Company Registered", body });
}