/**
 * Email template sent to a company when a new invoice is generated.
 *
 * @module invoice
 */
import { escapeHtml } from "./escape";

interface InvoiceData {
  companyName: string;
  amount: number;
  invoiceNumber: string;
  dueDate?: string;
  invoiceLink?: string;
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
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #eee;">
              <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                From Company
              </div>
              <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 6px;">
                SecReports
              </div>
              <div style="font-size: 14px; color: #666;">
                support@secreports.co.za
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #eee;">
              <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                To Company
              </div>
              <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 6px;">
                ${companyName}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Invoice Date</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333;">${invoiceDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Due Date</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333;">${formattedDueDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Invoice</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333;">#${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Item</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333;">Standard Package payment</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Amount Due</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333; font-size: 20px; font-weight: bold;">
              R ${(amount / 100).toLocaleString("en-ZA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Banking Details</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333;">
              <div>Bank: Your Bank</div>
              <div>Account Holder: SecReports (Pty) Ltd</div>
              <div>Account No: 0000000000</div>
              <div>Reference: #${invoiceNumber}</div>
            </td>
          </tr>
        </table>
        ${
          invoiceLink
            ? `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${invoiceLink}"
             style="background: #1e3a5f; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
            View Invoice
          </a>
        </div>`
            : ""
        }
        <p style="font-size: 14px; color: #777;">If you have any questions, please contact our support team.</p>
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
