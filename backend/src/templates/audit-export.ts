/**
 * Email template for a company audit log export.
 *
 * @module audit-export
 */
import { emailLayout, greeting, paragraph, mutedNote } from "./layout";
import { escapeHtml } from "./escape";

export default function auditExportTemplate({
  companyName,
  entryCount,
}: {
  companyName: string;
  entryCount: number;
}): string {
  const body = `
        ${greeting(companyName)}
        ${paragraph(
          `Please find attached the audit log export for <strong>${escapeHtml(companyName)}</strong>.`,
        )}
        ${paragraph(`Total entries: <strong>${entryCount}</strong>.`)}
        ${mutedNote("The full log is attached as a CSV file.")}
      `;

  return emailLayout({ title: "Audit Log Export", body });
}
