/**
 * Professional email template styled to match the SecReports brand.
 *
 * @module report
 */
import { escapeHtml } from "./escape";

interface ReportData {
  companyName: string;
  incidentAddress: string;
  incidentType: string;
  reportLink?: string;
}

export default function reportTemplate(data: ReportData): string {
  const { reportLink } = data;
  const companyName = escapeHtml(data.companyName);
  const incidentAddress = escapeHtml(data.incidentAddress || "N/A");
  const incidentType = escapeHtml(data.incidentType || "N/A");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Incident Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Main container -->
  <table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.02);">
    
    <!-- Header -->
    <tr>
      <td style="background: #0b1e33; padding: 32px 24px; text-align: center; border-bottom: 4px solid #e2e8f0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SecReports</h1>
        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px; font-weight: 400; letter-spacing: 0.3px; text-transform: uppercase;">Incident Management Platform</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 40px 32px;">
        <!-- Greeting -->
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 500;">Dear <strong style="color: #0b1e33;">${companyName}</strong>,</p>
        <p style="margin: 0 0 28px 0; font-size: 16px; color: #334155; line-height: 1.6;">A new incident report has been filed and is ready for your review within the SecReports platform.</p>

        <!-- Incident details card -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 6px 0; font-size: 15px; color: #475569;">
              <span style="font-weight: 600; color: #0b1e33;">📍 Address:</span> ${incidentAddress}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 15px; color: #475569;">
              <span style="font-weight: 600; color: #0b1e33;">📋 Type:</span> ${incidentType}
            </td>
          </tr>
        </table>

        <!-- Closing -->
        <p style="margin: 0 0 4px 0; font-size: 15px; color: #1e293b;">If you have any questions, please contact your security team or SecReports support.</p>
        <p style="margin: 0; font-size: 15px; color: #64748b;">— The SecReports Team</p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 13px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} SecReports. All rights reserved.
          <br />
          <span style="color: #cbd5e1;">This is an automated notification. Please do not reply directly.</span>
        </p>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
