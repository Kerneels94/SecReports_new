/**
 * Email template sent to a company when a new invoice is generated.
 *
 * @module invoice
 */
interface InvoiceData {
  companyName: string;
  amount: number;
  currency?: string;
  invoiceNumber: string;
  invoiceLink?: string;
}

export default function invoiceTemplate(data: InvoiceData): string {
  const { companyName, amount, currency = "ZAR", invoiceNumber, invoiceLink } = data;
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
        <p style="font-size: 16px; color: #333;">Your invoice <strong>#${invoiceNumber}</strong> is now available.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Invoice</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333;">#${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Amount Due</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333; font-size: 20px; font-weight: bold;">
              ${currency} ${amount.toLocaleString()}
            </td>
          </tr>
        </table>
        ${invoiceLink ? `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${invoiceLink}"
             style="background: #1e3a5f; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
            View Invoice
          </a>
        </div>` : ""}
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
