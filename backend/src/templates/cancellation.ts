/**
 * Email template sent to a company when their subscription is cancelled.
 *
 * @module cancellation
 */
import { escapeHtml } from "./escape";

interface CancellationData {
  companyName: string;
}

export default function cancellationTemplate(data: CancellationData): string {
  const companyName = escapeHtml(data.companyName);
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
        <p style="font-size: 16px; color: #333;">Hi ${companyName},</p>
        <p style="font-size: 16px; color: #333;">Your SecReports subscription has been <strong>cancelled</strong>.</p>
        <p style="font-size: 16px; color: #333;">You will continue to have access to your account until the end of the current billing period. After that, your account will be downgraded to the free plan with limited features.</p>
        <p style="font-size: 14px; color: #777;">If you believe this was a mistake or would like to reactivate your subscription, please contact our support team.</p>
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
