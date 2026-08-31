/**
 * Email template sent with a generated incident report.
 *
 * @module report
 */
import { escapeHtml } from "./escape";
import { emailLayout, greeting, paragraph, detailCard, signOff, ctaButton } from "./layout";

interface ReportData {
  companyName: string;
  incidentAddress: string;
  incidentType: string;
  reportLink?: string;
}

export default function reportTemplate(data: ReportData): string {
  const { reportLink } = data;
  const incidentAddress = escapeHtml(data.incidentAddress || "N/A");
  const incidentType = escapeHtml(data.incidentType || "N/A");

  const body = `
        ${greeting(data.companyName)}
        ${paragraph("A new incident report has been filed and is ready for your review within the SecReports platform.")}
        ${detailCard([
          { label: "Address", value: incidentAddress, icon: "📍" },
          { label: "Type", value: incidentType, icon: "📋" },
        ])}
        ${reportLink ? ctaButton(reportLink, "View Full Report") : ""}
        ${paragraph("If you have any questions, please contact your security team or SecReports support.")}
        ${signOff()}
      `;

  return emailLayout({ title: "Incident Report", body });
}