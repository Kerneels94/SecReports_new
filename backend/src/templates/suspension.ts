/**
 * Email template sent to a company when their account is suspended.
 *
 * @module suspension
 */
import { escapeHtml } from "./escape";
import { emailLayout, greeting, paragraph, alertParagraph, mutedNote, ctaButton } from "./layout";

interface SuspensionData {
  companyName: string;
  reason?: string;
}

export default function suspensionTemplate(data: SuspensionData): string {
  const safeReason = data.reason ? escapeHtml(data.reason) : undefined;
  const body = `
        ${greeting(data.companyName)}
        ${alertParagraph("Your SecReports account has been suspended.")}
        ${safeReason ? paragraph(`Reason: ${safeReason}`) : ""}
        ${paragraph("During the suspension period, you will not be able to access your account or create new incident reports.")}
        ${mutedNote("If you have any questions or believe this was done in error, please contact our support team immediately.")}
        ${ctaButton("mailto:support@secreports.co.za", "Contact Support")}
      `;

  return emailLayout({ title: "Account Suspended", body });
}