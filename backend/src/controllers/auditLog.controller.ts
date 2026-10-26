import { FastifyRequest, FastifyReply } from "fastify";
import PDFDocument from "pdfkit";
import { AuditLogService } from "../services/auditLog.service";
import { paginationSchema } from "../validators/incident.schema";
import { ValidationError } from "../lib/errors";
import { ADMIN_FROM_EMAIL, sendMail } from "../services/email.service";
import { prisma } from "../lib/db";

const COLORS = {
  gray: "#71717a",
  dark: "#09090b",
  light: "#fafafa",
  border: "#e4e4e7",
  muted: "#a1a1aa",
  faint: "#d4d4d8",
  white: "#ffffff",
  page: "#18181b",
  accent: "#22c55e",
  success: "#22c55e",
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

async function generateAuditLogsPdf(
  companyName: string,
  entries: any[],
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
        `Generated: ${new Date().toISOString()} | Entries: ${entries.length}`,
        50,
        y,
        { width: 495, align: "center" },
      );
    y += 30;

    doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.white);
    doc.text("Date", 50, y);
    doc.text("User", 130, y);
    doc.text("Email", 230, y);
    doc.text("Action", 330, y);
    doc.text("Entity", 400, y);
    doc.text("IP", 470, y);
    y += 12;
    doc.rect(50, y, 495, 1).fill(COLORS.border);
    y += 10;

    doc.font("Helvetica").fillColor(COLORS.faint);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (y > doc.page.height - 110) {
        drawFooter(doc);
        doc.addPage();
        y = drawHeader(doc) + 20;
        doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.white);
        doc.text("Date", 50, y);
        doc.text("User", 130, y);
        doc.text("Email", 230, y);
        doc.text("Action", 330, y);
        doc.text("Entity", 400, y);
        doc.text("IP", 470, y);
        y += 12;
        doc.rect(50, y, 495, 1).fill(COLORS.border);
        y += 10;
        doc.font("Helvetica").fillColor(COLORS.faint);
      }

      doc.fontSize(7).fillColor(COLORS.faint);
      doc.text(formatDate(e.createdAt), 50, y, { width: 75 });
      doc.text((e.performedByUser?.name || "").substring(0, 28), 130, y, {
        width: 95,
      });
      doc.text((e.performedByUser?.email || "").substring(0, 32), 230, y, {
        width: 95,
      });
      doc.text((e.action || "").substring(0, 20), 330, y, { width: 65 });
      doc.text((e.entityType || "").substring(0, 18), 400, y, { width: 65 });
      doc.text((e.ipAddress || "").substring(0, 20), 470, y, { width: 75 });
      y += 14;
    }

    drawFooter(doc);
    doc.end();
  });
}

export const AuditLogController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { entityType, action, dateFrom, dateTo, search } =
      request.query as Record<string, string | undefined>;

    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success)
      throw new ValidationError("Invalid query", parsed.error.flatten());
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
      throw new ValidationError("Invalid query", parsed.error.flatten());
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

  /** Export audit logs for a specific company to superadmin and the client. */
  async exportCompany(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.params as { companyId?: string };

    // If no companyId provided or empty, export all logs
    if (!companyId || companyId === "all") {
      const { entries } = await AuditLogService.exportAll();
      const companies = await prisma.company.findMany({
        select: { email: true, name: true },
      });
      const superadmins = await prisma.user.findMany({
        where: { role: "superadmin", status: "active" },
        select: { email: true },
      });
      const recipients = Array.from(
        new Set(
          [
            ...companies.map((c) => c.email).filter(Boolean),
            ...superadmins.map((u) => u.email),
          ].filter(Boolean),
        ),
      ) as string[];

      const pdf = await generateAuditLogsPdf("All Companies", entries);
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
          data: { emailedTo: recipients, count: entries.length },
        });
    }

    const { company, entries } =
      await AuditLogService.exportForCompany(companyId);
    if (!company) throw new ValidationError("Company not found");

    const superadmins = await prisma.user.findMany({
      where: { role: "superadmin", status: "active" },
      select: { email: true },
    });
    const recipients = Array.from(
      new Set(
        [company.email, ...superadmins.map((u) => u.email)].filter(Boolean),
      ),
    ) as string[];

    const pdf = await generateAuditLogsPdf(company.name, entries);
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
        data: { emailedTo: recipients, count: entries.length },
      });
  },
};
