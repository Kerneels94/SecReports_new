/**
 * Email template sent to a new user upon account creation.
 *
 * @module welcome
 */
import { escapeHtml } from "./escape";
import { getAppUrl } from "../lib/app-url";

export default function welcomeTemplate(name: string): string {
  const safeName = escapeHtml(name);
  const appUrl = getAppUrl();
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
    <tr>
      <td style="background: #1e3a5f; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SecReports</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #333;">Hi ${safeName},</p>
        <p style="font-size: 16px; color: #333;">Welcome to <strong>SecReports</strong>! Your account has been created successfully.</p>
        <p style="font-size: 16px; color: #333;">You can now log in and start reporting incidents.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${appUrl}/dashboard"
             style="background: #1e3a5f; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
            Sign In to SecReports
          </a>
        </div>
        <p style="font-size: 14px; color: #777;">If you did not create this account, please disregard this email.</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f4f4f4; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
        &copy; ${new Date().getFullYear()} SecReports. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>`;
}
