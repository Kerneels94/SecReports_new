/**
 * Invoice PDF attachment sent alongside the invoice email.
 *
 * Mirrors the email invoice (templates/invoice.ts) so the attached document and
 * the email body show the same figures. Uses the shared brand colours from
 * layout.ts, matching export.controller.ts.
 *
 * @module invoice-pdf
 */
import PDFDocument from "pdfkit";
import { BRAND } from "./layout";

export interface InvoicePdfData {
  companyName: string;
  amount: number;
  invoiceNumber: string;
  dueDate: Date | string;
  invoiceDate?: Date;
  /** Line item text; defaults to the same label used by the email. */
  description?: string;
}

const COLORS = {
  page: BRAND.background,
  surface: BRAND.surface,
  border: BRAND.border,
  muted: BRAND.muted,
  faint: BRAND.faint,
  heading: BRAND.heading,
  body: BRAND.body,
  label: BRAND.label,
  success: BRAND.success,
  white: "#ffffff",
};

function formatCurrency(cents: number): string {
  return `R ${(cents / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Renders the invoice and resolves with the finished PDF as a Buffer. */
export function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.page);

    // Brand header.
    doc.rect(50, 40, 495, 64).fill(COLORS.page);
    doc.fillColor(COLORS.white).fontSize(22).font("Helvetica-Bold")
      .text("SecReports", 50, 54, { width: 495, align: "center" });
    doc.fillColor(COLORS.muted).fontSize(9).font("Helvetica")
      .text("INCIDENT MANAGEMENT PLATFORM", 50, 82, { width: 495, align: "center", characterSpacing: 1.2 });
    doc.rect(50, 104, 495, 4).fill(COLORS.success);

    let y = 140;
    doc.fillColor(COLORS.white).fontSize(24).font("Helvetica-Bold")
      .text("INVOICE", 50, y, { width: 495, align: "center" });
    y += 44;

    // From / To columns.
    doc.fontSize(9).font("Helvetica").fillColor(COLORS.faint)
      .text("FROM COMPANY", 50, y);
    doc.fontSize(9).font("Helvetica").fillColor(COLORS.faint)
      .text("TO COMPANY", 300, y);
    doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.heading)
      .text("SecReports", 50, y + 16, { width: 230 });
    doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.heading)
      .text(data.companyName || "Valued Customer", 300, y + 16, { width: 245 });
    doc.fontSize(10).font("Helvetica").fillColor(COLORS.body)
      .text("support@secreports.co.za", 50, y + 36, { width: 230 });
    y += 70;

    // Detail rows: label left, value right, on a bordered panel.
    const rows: [string, string][] = [
      ["Invoice Date", formatDate(data.invoiceDate ?? new Date())],
      ["Due Date", formatDate(data.dueDate)],
      ["Invoice", `#${data.invoiceNumber}`],
      ["Item", data.description || "Standard Package payment"],
    ];

    const rowH = 30;
    const panelH = rows.length * rowH;
    doc.save();
    doc.roundedRect(50, y, 495, panelH, 8).clip();
    doc.rect(50, y, 495, panelH).fill(COLORS.surface);
    rows.forEach(([label, value], i) => {
      const ry = y + i * rowH;
      if (i > 0) doc.rect(50, ry, 495, 1).fill(COLORS.border);
      doc.fontSize(10).font("Helvetica").fillColor(COLORS.label)
        .text(label, 66, ry + 10, { width: 200 });
      doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.heading)
        .text(value, 266, ry + 10, { width: 263, align: "right" });
    });
    doc.restore();
    doc.roundedRect(50, y, 495, panelH, 8).stroke(COLORS.border);
    y += panelH + 24;

    // Amount due highlight.
    doc.save();
    doc.roundedRect(50, y, 495, 64, 8).clip();
    doc.rect(50, y, 495, 64).fill(COLORS.surface);
    doc.rect(50, y, 495, 4).fill(COLORS.success);
    doc.restore();
    doc.fillColor(COLORS.faint).fontSize(9).font("Helvetica")
      .text("AMOUNT DUE", 66, y + 18);
    doc.fillColor(COLORS.white).fontSize(22).font("Helvetica-Bold")
      .text(formatCurrency(data.amount), 66, y + 32, { width: 463, align: "right" });
    y += 64 + 24;

    // Banking details.
    doc.fontSize(9).font("Helvetica").fillColor(COLORS.faint)
      .text("BANKING DETAILS", 50, y);
    y += 18;
    const banking = [
      "Bank: Your Bank",
      "Account Holder: SecReports (Pty) Ltd",
      "Account No: 0000000000",
      `Reference: #${data.invoiceNumber}`,
    ];
    doc.fontSize(10).font("Helvetica").fillColor(COLORS.body)
      .text(banking.join("\n"), 50, y, { width: 495, lineGap: 4 });

    // Footer.
    const fy = doc.page.height - 85;
    doc.rect(50, fy, 495, 3).fill(COLORS.success);
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
      .text(`© ${new Date().getFullYear()} SecReports. All rights reserved.`, 50, fy + 10, { width: 495, align: "center" })
      .fillColor(COLORS.faint)
      .text("This is an automated notification. Please do not reply directly.", 50, fy + 22, { width: 495, align: "center" });

    doc.end();
  });
}
