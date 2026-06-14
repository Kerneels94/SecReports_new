/**
 * Email template sent when a new incident report is created.
 *
 * @module report
 */
interface ReportData {
  name: string;
  incidentTitle: string;
  referenceNumber: string;
  reportLink?: string;
}

export default function reportTemplate(data: ReportData): string {
  const { name, incidentTitle, referenceNumber, reportLink } = data;
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
        <p style="font-size: 16px; color: #333;">A new incident report has been created:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #f9f9f9; border-radius: 6px;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #999;">REFERENCE</p>
              <p style="margin: 0; font-size: 18px; color: #1e3a5f; font-weight: bold;">${referenceNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 16px 16px;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #999;">TITLE</p>
              <p style="margin: 0; font-size: 16px; color: #333;">${incidentTitle}</p>
            </td>
          </tr>
        </table>
        ${reportLink ? `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${reportLink}"
             style="background: #1e3a5f; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
            View Report
          </a>
        </div>` : ""}
        <p style="font-size: 14px; color: #777;">This is an automated notification from SecReports.</p>
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
