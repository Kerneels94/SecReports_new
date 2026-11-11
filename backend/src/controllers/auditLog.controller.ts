import { FastifyRequest, FastifyReply } from "fastify";
import PDFDocument from "pdfkit";
import { AuditLogService, type AuditLogFilters } from "../services/auditLog.service";
import { paginationSchema } from "../validators/incident.schema";
import { validationErrorMessage } from "../validators/shared";
import { ValidationError } from "../lib/errors";
import { ADMIN_FROM_EMAIL, sendMail } from "../services/email.service";
import { prisma } from "../lib/db";
import { BRAND } from "../templates/layout";

const COLORS = {
  gray: BRAND.label,
  dark: BRAND.heading,
  light: BRAND.surface,
  border: BRAND.border,
  muted: BRAND.muted,
  faint: BRAND.faint,
  white: "#ffffff",
  page: BRAND.background,
  accent: BRAND.accent,
  success: BRAND.success,
};

function newDoc(): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const paint = () =>
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.page);
  paint();
  doc.on("pageAdded", paint);
  return doc;
}

function drawHeader(doc: PDFKit.PDFDocument): number {
  doc.rect(50, 40, 495, 64).fill(COLORS.page);
  doc
    .fillColor(COLORS.white)
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("SecReports", 50, 54, { width: 495, align: "center" });
  doc
    .fillColor(COLORS.muted)
    .fontSize(9)
    .font("Helvetica")
    .text("INCIDENT MANAGEMENT PLATFORM", 50, 82, {
      width: 495,
      align: "center",
      characterSpacing: 1.2,
    });
  doc.rect(50, 104, 495, 4).fill(COLORS.border);
  doc.fillColor(COLORS.dark);
  return 130;
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const y = doc.page.height - 85;
  doc.rect(50, y, 495, 3).fill(COLORS.success);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      `© ${new Date().getFullYear()} SecReports. All rights reserved.`,
      50,
      y + 10,
      { width: 495, align: "center" },
    )
    .fillColor(COLORS.faint)
    .text(
      "This is an automated notification. Please do not reply directly.",
      50,
      y + 22,
      { width: 495, align: "center" },
    );
}

function formatDate(d: Date | string) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One audit-log row as the PDF renderer needs it. */
interface AuditExportEntry {
  createdAt: Date | string;
  action: string | null;
  entityType: string | null;
  ipAddress: string | null;
  performedByUser: { name: string | null; email: string | null } | null;
}

/** Column layout for the audit table. Widths add up to the 495pt content area. */
const AUDIT_COLUMNS = [
  { label: "Date", x: 50, width: 75 },
  { label: "User", x: 128, width: 72 },
  { label: "Email", x: 203, width: 112 },
  { label: "Action", x: 318, width: 62 },
  { label: "Entity", x: 383, width: 57 },
  { label: "IP", x: 443, width: 102 },
] as const;

function drawTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.white);
  for (const col of AUDIT_COLUMNS) doc.text(col.label, col.x, y, { width: col.width });
  y += 12;
  doc.rect(50, y, 495, 1).fill(COLORS.border);
  return y + 10;
}

/**
 * Renders audit entries as a PDF table. Cells are never truncated: long
 * emails and IPv6 addresses wrap and the row grows to fit, because the
 * export is evidence and must identify the actor and source exactly.
 * When `total` exceeds the rows rendered, the header says the file is partial.
 */
async function generateAuditLogsPdf(
  companyName: string,
  entries: AuditExportEntry[],
  total: number = entries.length,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = newDoc();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = drawHeader(doc) + 10;

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(COLORS.white)
      .text("Audit Log Export", 50, y, { width: 495, align: "center" });
    y += 22;
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(COLORS.muted)
      .text(companyName, 50, y, { width: 495, align: "center" });
    y += 16;
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(COLORS.faint)
      .text(
        `Generated: ${new Date().toISOString()} | Entries: ${entries.length}${total > entries.length ? ` of ${total}` : ""}`,
        50,
        y,
        { width: 495, align: "center" },
      );
    y += 14;
    if (total > entries.length) {
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(COLORS.accent)
        .text(
          `Partial export: only the newest ${entries.length} entries are included. Export with a date range to get older entries.`,
          50,
          y,
          { width: 495, align: "center" },
        );
      y += 22;
    } else {
      y += 16;
    }

    y = drawTableHeader(doc, y);

    for (const e of entries) {
      const cells = [
        formatDate(e.createdAt),
        e.performedByUser?.name || "",
        e.performedByUser?.email || "",
        e.action || "",
        e.entityType || "",
        e.ipAddress || "",
      ];

      doc.fontSize(7).font("Helvetica");
      const rowHeight = Math.max(
        ...cells.map((text, i) => doc.heightOfString(text, { width: AUDIT_COLUMNS[i].width })),
      );

      if (y + rowHeight > doc.page.height - 110) {
        drawFooter(doc);
        doc.addPage();
        y = drawTableHeader(doc, drawHeader(doc) + 20);
        doc.fontSize(7).font("Helvetica");
      }

      doc.fillColor(COLORS.faint);
      cells.forEach((text, i) => {
        doc.text(text, AUDIT_COLUMNS[i].x, y, { width: AUDIT_COLUMNS[i].width });
      });
      y += rowHeight + 6;
    }

    drawFooter(doc);
    doc.end();
  });
}

/** Reads the list filters from the query string so exports match the table. */
function exportFilters(query: unknown): AuditLogFilters {
  const { entityType, action, dateFrom, dateTo, search } =
    (query ?? {}) as Record<string, string | undefined>;
  return { entityType, action, dateFrom, dateTo, search };
}

export const AuditLogController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { entityType, action, dateFrom, dateTo, search } =
      request.query as Record<string, string | undefined>;

    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success)
      throw new ValidationError(validationErrorMessage(parsed.error), parsed.error.flatten());
    const { page, perPage } = parsed.data;

    const data = await AuditLogService.list({
      page,
      perPage,
      companyId: request.user!.companyId,
      entityType,
      action,
      dateFrom,
      dateTo,
      search,
    });

    reply.code(200).send({ success: true, data });
  },

  /** Superadmin listing across every company, optionally filtered to one. */
  async adminList(request: FastifyRequest, reply: FastifyReply) {
    const { companyId, entityType, action, dateFrom, dateTo, search } =
      request.query as Record<string, string | undefined>;

    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success)
      throw new ValidationError(validationErrorMessage(parsed.error), parsed.error.flatten());
    const { page, perPage } = parsed.data;

    const data = await AuditLogService.list({
      page,
      perPage,
      companyId: companyId || null,
      entityType,
      action,
      dateFrom,
      dateTo,
      search,
    });

    reply.code(200).send({ success: true, data });
  },

  /** Download the current company's audit logs as a PDF. */
  async exportOwnCompany(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user!.companyId;
    if (!companyId) throw new ValidationError("Company is required");

    const { company, entries, total } =
      await AuditLogService.exportForCompany(companyId, exportFilters(request.query));
    if (!company) throw new ValidationError("Company not found");

    const pdf = await generateAuditLogsPdf(company.name, entries, total);
    const filename = `audit-logs-${company.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now()}.pdf`;
    reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      // Audit logs are sensitive: stop the browser keeping a cached copy
      // that outlives the session on a shared machine.
      .header("Cache-Control", "no-store")
      .code(200)
      .send(pdf);
  },

  /** Export audit logs for a specific company to superadmins only. */
  async exportCompany(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.params as { companyId?: string };

    // If no companyId provided or empty, export all logs
    if (!companyId || companyId === "all") {
      const { entries, total } = await AuditLogService.exportAll(exportFilters(request.query));
      const superadmins = await prisma.user.findMany({
        where: { role: "superadmin", status: "active" },
        select: { email: true },
      });
      const recipients = Array.from(
        new Set(superadmins.map((u) => u.email).filter(Boolean)),
      ) as string[];

      const pdf = await generateAuditLogsPdf("All Companies", entries, total);
      const filename = `audit-logs-all-${Date.now()}.pdf`;
      for (const to of recipients) {
        await sendMail({
          to,
          subject: "audit_export",
          data: { companyName: "All Companies", entryCount: entries.length },
          from: ADMIN_FROM_EMAIL,
          attachments: [
            { filename, content: pdf, contentType: "application/pdf" },
          ],
        });
      }
      return reply
        .code(200)
        .send({
          success: true,
          data: { emailedTo: recipients, count: entries.length, total },
        });
    }

    const { company, entries, total } =
      await AuditLogService.exportForCompany(companyId, exportFilters(request.query));
    if (!company) throw new ValidationError("Company not found");

    const superadmins = await prisma.user.findMany({
      where: { role: "superadmin", status: "active" },
      select: { email: true },
    });
    const recipients = Array.from(
      new Set(superadmins.map((u) => u.email).filter(Boolean)),
    ) as string[];

    const pdf = await generateAuditLogsPdf(company.name, entries, total);
    const filename = `audit-logs-${company.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now()}.pdf`;
    for (const to of recipients) {
      await sendMail({
        to,
        subject: "audit_export",
        data: { companyName: company.name, entryCount: entries.length },
        from: ADMIN_FROM_EMAIL,
        attachments: [
          { filename, content: pdf, contentType: "application/pdf" },
        ],
      });
    }

    reply
      .code(200)
      .send({
        success: true,
        data: { emailedTo: recipients, count: entries.length, total },
      });
  },
};
