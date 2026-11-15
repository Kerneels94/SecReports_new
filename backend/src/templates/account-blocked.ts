/**
 * Email template sent when an account is blocked after too many wrong
 * password attempts, with a one-time link to unblock it.
 *
 * @module account-blocked
 */
import { emailLayout, greeting, paragraph, alertParagraph, ctaButton, mutedNote } from "./layout";

export default function accountBlockedTemplate(name: string, unblockLink: string): string {
  const body = `
        ${greeting(name)}
        ${alertParagraph("Your SecReports account has been blocked because the wrong password was entered too many times.")}
        ${paragraph("If this was you, click the button below to unblock your account, then log in with your correct password.")}
        ${ctaButton(unblockLink, "Unblock My Account")}
        ${mutedNote("This link will expire in <strong>1 hour</strong>. If it has expired, use <strong>Forgot password</strong> on the login page, which also unblocks your account.")}
        ${mutedNote("If this was not you, someone may be trying to guess your password. Unblock your account and consider changing your password.")}
      `;

  return emailLayout({ title: "Account Blocked", body });
}
