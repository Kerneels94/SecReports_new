/**
 * Email template sent to a new user upon account creation.
 *
 * @module welcome
 */
import { getAppUrl } from "../lib/app-url";
import { emailLayout, greeting, paragraph, ctaButton, mutedNote } from "./layout";

export default function welcomeTemplate(name: string): string {
  const appUrl = getAppUrl();
  const body = `
        ${greeting(name)}
        ${paragraph("Welcome to <strong>SecReports</strong>! Your account has been created successfully.")}
        ${paragraph("You can now log in and start reporting incidents.")}
        ${ctaButton(`${appUrl}/dashboard`, "Sign In to SecReports")}
        ${mutedNote("If you did not create this account, please disregard this email.")}
      `;

  return emailLayout({ title: "Welcome to SecReports", body });
}