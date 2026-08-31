/**
 * Email template sent to a user after their password has been changed.
 *
 * @module password-changed
 */
import { getAppUrl } from "../lib/app-url";
import { emailLayout, greeting, paragraph, alertParagraph, ctaButton } from "./layout";

export default function passwordChangedTemplate(name: string): string {
  const appUrl = getAppUrl();
  const body = `
        ${greeting(name)}
        ${paragraph("Your SecReports account password has been successfully changed.")}
        ${alertParagraph("If you did not make this change, please contact your administrator immediately or reply to this email.")}
        ${paragraph("You can sign in with your new password at any time.")}
        ${ctaButton(`${appUrl}/dashboard`, "Sign In to SecReports")}
      `;

  return emailLayout({ title: "Password Changed", body });
}