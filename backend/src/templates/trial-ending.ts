import { escapeHtml } from "./escape";

interface TrialEndingData {
  name: string;
  daysRemaining: number;
}

export default function trialEndingTemplate(data: TrialEndingData): string {
  const name = escapeHtml(data.name);
  const days = data.daysRemaining;
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
        <p style="font-size: 16px; color: #333;">Hi ${name},</p>
        <p style="font-size: 16px; color: #333;">Your <strong>14-day free trial</strong> is ending soon.</p>
        <p style="font-size: 16px; color: #333;">You have <strong>${days} day${days === 1 ? "" : "s"}</strong> remaining. After your trial ends, access to certain features will be limited.</p>
        <p style="font-size: 16px; color: #333;">Upgrade to <strong>Professional</strong> or <strong>Enterprise</strong> to keep full access.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="https://secreports.app/settings/billing" style="background: #1e3a5f; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">Upgrade Now</a>
        </p>
        <p style="font-size: 14px; color: #777;">If you have any questions, contact our support team.</p>
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
