/**
 * Email template sent to a company when a new invoice is generated.
 *
 * @module invoice
 */
import { escapeHtml } from "./escape";
import { BRAND, emailLayout, greeting, ctaButton, mutedNote } from "./layout";

interface InvoiceData {
  companyName: string;
  amount: number;
  invoiceNumber: string;
  dueDate?: string;
  invoiceLink?: string;
}

function detailRow(label: string, value: string): string {
  return `
          <tr>
            <td style="padding: 12px 24px; border-bottom: 1px solid ${BRAND.border}; font-size: 14px; color: ${BRAND.label};">${label}</td>
            <td style="padding: 12px 24px; border-bottom: 1px solid ${BRAND.border}; text-align: right; font-size: 14px; color: ${BRAND.heading}; font-weight: 600;">${value}</td>
          </tr>`;
}

function invoiceTable(rows: string): string {
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${BRAND.background}; border: 1px solid ${BRAND.border}; border-radius: 12px; margin-bottom: 32px;">
    ${rows}
  </table>`;
}

export default function invoiceTemplate(data: InvoiceData): string {
  const { amount, invoiceLink, dueDate } = data;
  const companyName = escapeHtml(data.companyName);
  const invoiceNumber = escapeHtml(data.invoiceNumber);

  const invoiceDate = new Date().toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const formattedAmount = `R ${(amount / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const rows = `
        <tr>
          <td colspan="2" style="padding: 20px 24px; border-bottom: 1px solid ${BRAND.border};">
            <div style="font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">From Company</div>
            <div style="font-size: 18px; font-weight: 700; color: ${BRAND.heading}; margin-bottom: 4px;">SecReports</div>
            <div style="font-size: 14px; color: ${BRAND.body};">support@secreports.co.za</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 20px 24px; border-bottom: 1px solid ${BRAND.border};">
            <div style="font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">To Company</div>
            <div style="font-size: 18px; font-weight: 700; color: ${BRAND.heading}; margin-bottom: 4px;">${companyName}</div>
          </td>
        </tr>
        ${detailRow("Invoice Date", invoiceDate)}
        ${detailRow("Due Date", formattedDueDate)}
        ${detailRow("Invoice", `#${invoiceNumber}`)}
        ${detailRow("Item", "Standard Package payment")}
        <tr>
          <td colspan="2" style="padding: 18px 24px; background: ${BRAND.navy};">
            <div style="font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Amount Due</div>
            <div style="font-size: 22px; font-weight: 700; color: #ffffff;">${formattedAmount}</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 16px 24px;">
            <div style="font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Banking Details</div>
            <div style="font-size: 14px; color: ${BRAND.body}; line-height: 1.7;">
              <div>Bank: Your Bank</div>
              <div>Account Holder: SecReports (Pty) Ltd</div>
              <div>Account No: 0000000000</div>
              <div>Reference: #${invoiceNumber}</div>
            </div>
          </td>
        </tr>
      `;

  const body = `
        ${greeting(data.companyName)}
        ${invoiceTable(rows)}
        ${invoiceLink ? ctaButton(invoiceLink, "View Invoice") : ""}
        ${mutedNote("If you have any questions, please contact our support team.")}
      `;

  return emailLayout({ title: "Invoice from SecReports", body });
}