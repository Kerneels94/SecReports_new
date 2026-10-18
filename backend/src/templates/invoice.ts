/**
 * Email template sent to a company when a new invoice is generated.
 *
 * @module invoice
 */
import { escapeHtml } from "./escape";
import { BRAND, emailLayout, greeting, ctaButton, mutedNote } from "./layout";
import {
  BUSINESS_NAME,
  BUSINESS_EMAIL,
  BUSINESS_ADDRESS,
  BANK_DETAILS,
  DEFAULT_ITEM_DESCRIPTION,
} from "./invoice-details";

interface InvoiceData {
  companyName: string;
  amount: number;
  invoiceNumber: string;
  dueDate?: string;
  description?: string;
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

  const addressLine = BUSINESS_ADDRESS.map(
    (line) =>
      `<div style="font-size: 14px; color: ${BRAND.body};">${escapeHtml(line)}</div>`,
  ).join("");

  const itemDescription = escapeHtml(data.description || DEFAULT_ITEM_DESCRIPTION);

  const rows = `
        <tr>
          <td colspan="2" style="padding: 20px 24px; border-bottom: 1px solid ${BRAND.border};">
            <div style="font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">From Company</div>
            <div style="font-size: 18px; font-weight: 700; color: ${BRAND.heading}; margin-bottom: 4px;">${BUSINESS_NAME}</div>
            <div style="font-size: 14px; color: ${BRAND.body}; margin-bottom: 4px;">${BUSINESS_EMAIL}</div>
            ${addressLine}
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
        ${detailRow("Item", itemDescription)}
        <tr>
          <td colspan="2" style="padding: 18px 24px; background: ${BRAND.surface}; border-top: 4px solid ${BRAND.success};">
            <div style="font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Amount Due</div>
            <div style="font-size: 22px; font-weight: 700; color: #ffffff;">${formattedAmount}</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 16px 24px;">
            <div style="font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Banking Details</div>
            <div style="font-size: 14px; color: ${BRAND.body}; line-height: 1.7;">
              <div>Bank: ${escapeHtml(BANK_DETAILS.bankName)}</div>
              <div>Account Holder: ${escapeHtml(BANK_DETAILS.accountHolder)}</div>
              <div>Account No: ${escapeHtml(BANK_DETAILS.accountNumber)}</div>
              ${BANK_DETAILS.branchCode ? `<div>Branch Code: ${escapeHtml(BANK_DETAILS.branchCode)}</div>` : ""}
              <div>Reference: #${invoiceNumber}</div>
            </div>
          </td>
        </tr>
      `;

  const body = `
        <h2 style="margin: 0 0 20px 0; text-align: center; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">Invoice</h2>
        ${greeting(data.companyName)}
        ${invoiceTable(rows)}
        ${invoiceLink ? ctaButton(invoiceLink, "View Invoice") : ""}
        ${mutedNote("If you have any questions, please contact our support team.")}
      `;

  return emailLayout({ title: "Invoice", body });
}