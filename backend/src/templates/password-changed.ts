/**
 * Email template sent to a user after their password has been changed.
 *
 * @module password-changed
 */
import { escapeHtml } from "./escape";

export default function passwordChangedTemplate(name: string): string {
  const safeName = escapeHtml(name);
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
        <p style="font-size: 16px; color: #333;">Your SecReports account password has been successfully changed.</p>
        <p style="font-size: 16px; color: #b91c1c; font-weight: bold;">If you did not make this change, please contact your administrator immediately or reply to this email.</p>
        <p style="font-size: 14px; color: #777;">You can sign in with your new password at any time.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.APP_URL || "http://localhost:3000"}/login"
             style="background: #1e3a5f; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
            Sign In to SecReports
          </a>
        </div>
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
