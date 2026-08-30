/**
 * Patrol export controller — handles data export (CSV and PDF) for patrol reports.
 * Accepts optional site/date filters to export specific subsets of patrol data.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/db";
import { sendMail } from "../services/email.service";

interface PatrolForExport {
  id: string;
  siteName: string;
  guardName: string;
  startedAt: Date;
  completedAt: Date | null;
  status: string;
  notes: string | null;
  checkpointCount: number;
}

const COLORS = {
  primary: "#2962FF",
  gray: "#6B7280",
  dark: "#1F2937",
  light: "#F3F4F6",
  white: "#FFFFFF",
  success: "#10B981",
  warning: "#F59E0B",
};

function sanitizeCsv(val: string): string {
  if (/^[=+\-@]/.test(val)) return `" ${val.replace(/"/g, '""')}"`;
  return `"${val.replace(/"/g, '""')}"`;
}

function drawHeader(doc: typeof PDFDocument.prototype) {
  doc.rect(50, 40, 495, 50).fill(COLORS.primary);
  doc.fillColor(COLORS.white).fontSize(18).font("Helvetica-Bold").text("Patrol Report", 60, 52);
  doc.fillColor(COLORS.white).fontSize(9).font("Helvetica").text("Security Guarding Patrol Summary", 60, 74);
  doc.fillColor(COLORS.dark);
}

function generatePatrolPdf(patrols: PatrolForExport[], siteFilter?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc);

    let y = 110;
    const title = siteFilter ? `Patrols for ${siteFilter}` : "All Patrol Reports";
    doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.dark).text(title, 50, y);
    y += 20;
    doc.fontSize(9).font("Helvetica").fillColor(COLORS.gray).text(
      `Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      50, y,
    );
    y += 25;

    const headers = ["Date", "Site", "Guard", "Duration", "Checkpoints", "Status"];
    const colX = [50, 130, 250, 360, 440, 520];
    const colWidths = [80, 120, 110, 80, 80, 80];

    doc.rect(50, y, 520, 22).fill(COLORS.light);
    headers.forEach((h, i) => {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.dark).text(h, colX[i], y + 6, { width: colWidths[i] });
    });
    y += 26;

    patrols.forEach((p) => {
      if (y > 560) {
        doc.addPage();
        y = 50;
        doc.rect(50, y, 520, 22).fill(COLORS.light);
        headers.forEach((h, i) => {
          doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.dark).text(h, colX[i], y + 6, { width: colWidths[i] });
        });
        y += 26;
      }

      const start = new Date(p.startedAt);
      const end = p.completedAt ? new Date(p.completedAt) : null;
      const durationMs = end ? end.getTime() - start.getTime() : null;
      const durationStr = durationMs
        ? `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`
        : "In progress";

      const dateStr = start.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const values = [
        dateStr,
        p.siteName,
        p.guardName,
        durationStr,
        String(p.checkpointCount),
        p.status.replace(/_/g, " "),
      ];

      values.forEach((v, i) => {
        doc.fontSize(8).font("Helvetica").fillColor(COLORS.dark).text(v, colX[i], y, { width: colWidths[i] });
      });
      y += 18;
    });

    doc.fontSize(7).font("Helvetica").fillColor(COLORS.gray).text(
      `Total: ${patrols.length} patrol reports`,
      50, 580, { align: "left" },
    );

    doc.end();
  });
}

async function fetchPatrolsForExport(
  companyId: string,
  filters?: { siteId?: string; dateFrom?: string; dateTo?: string },
): Promise<PatrolForExport[]> {
  const where: any = { site: { companyId } };
  if (filters?.siteId) where.siteId = filters.siteId;
  if (filters?.dateFrom || filters?.dateTo) {
    where.startedAt = {};
    if (filters?.dateFrom) where.startedAt.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) where.startedAt.lte = new Date(filters.dateTo);
  }

  const reports = await prisma.patrolReport.findMany({
    where,
    include: {
      site: { select: { id: true, name: true } },
      guard: { select: { id: true, name: true, surname: true } },
      _count: { select: { checkpoints: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return reports.map((r) => ({
    id: r.id,
    siteName: r.site?.name ?? "Unknown",
    guardName: `${r.guard?.name ?? ""} ${r.guard?.surname ?? ""}`.trim() || "Unknown",
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    status: r.status,
    notes: r.notes,
    checkpointCount: r._count?.checkpoints ?? 0,
  }));
}

export const PatrolExportController = {
  /** Export patrol reports as a CSV file download. Accepts optional site/date filters. */
  async csv(request: FastifyRequest, reply: FastifyReply) {
    const { siteId, dateFrom, dateTo } = request.query as {
      siteId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const patrols = await fetchPatrolsForExport(request.user!.companyId, { siteId, dateFrom, dateTo });

    if (patrols.length === 0) {
      reply.code(404).send({ success: false, error: { code: "NOT_FOUND", message: "No patrol reports found" } });
      return;
    }

    const headers = ["Date", "Site", "Guard", "Duration", "Checkpoints", "Status", "Notes"];

    const rows = patrols.map((p) => {
      const start = new Date(p.startedAt);
      const end = p.completedAt ? new Date(p.completedAt) : null;
      const durationMs = end ? end.getTime() - start.getTime() : null;
      const durationStr = durationMs
        ? `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`
        : "In progress";

      return [
        sanitizeCsv(start.toISOString().split("T")[0]),
        sanitizeCsv(p.siteName),
        sanitizeCsv(p.guardName),
        sanitizeCsv(durationStr),
        sanitizeCsv(String(p.checkpointCount)),
        sanitizeCsv(p.status),
        sanitizeCsv(p.notes || ""),
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=patrol-reports.csv");
    reply.code(200).send(csv);
  },

  /** Export patrol reports as a PDF file download. Accepts optional site/date filters. */
  async pdf(request: FastifyRequest, reply: FastifyReply) {
    const { siteId, dateFrom, dateTo, siteName } = request.query as {
      siteId?: string;
      dateFrom?: string;
      dateTo?: string;
      siteName?: string;
    };

    const patrols = await fetchPatrolsForExport(request.user!.companyId, { siteId, dateFrom, dateTo });

    if (patrols.length === 0) {
      reply.code(404).send({ success: false, error: { code: "NOT_FOUND", message: "No patrol reports found" } });
      return;
    }

    const pdfBuffer = await generatePatrolPdf(patrols, siteName);

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", "attachment; filename=patrol-reports.pdf");
    reply.code(200).send(pdfBuffer);
  },

  /** Email patrol reports as a CSV or PDF attachment to a given email address. */
  async email(request: FastifyRequest, reply: FastifyReply) {
    const { email, format, siteId, dateFrom, dateTo, siteName } = request.body as {
      email: string;
      format: "csv" | "pdf";
      siteId?: string;
      dateFrom?: string;
      dateTo?: string;
      siteName?: string;
    };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      reply.code(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid email address" } });
      return;
    }

    if (format !== "csv" && format !== "pdf") {
      reply.code(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Format must be 'csv' or 'pdf'" } });
      return;
    }

    const patrols = await fetchPatrolsForExport(request.user!.companyId, { siteId, dateFrom, dateTo });

    if (patrols.length === 0) {
      reply.code(404).send({ success: false, error: { code: "NOT_FOUND", message: "No patrol reports found" } });
      return;
    }

    const reportLabel = siteName || "All Sites";
    const filename = format === "pdf" ? "patrol-reports.pdf" : "patrol-reports.csv";

    const company = await prisma.company.findUnique({ where: { id: request.user!.companyId! } });
    const companyName = company?.name || "SecReports";

    if (format === "pdf") {
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generatePatrolPdf(patrols, siteName);
      } catch {
        reply.code(500).send({ success: false, error: { code: "PDF_FAILED", message: "Failed to generate PDF" } });
        return;
      }

      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress: reportLabel,
          incidentType: "Patrol Report",
        },
        attachments: [{ filename, content: pdfBuffer }],
      });

      if (result.error) {
        reply.code(500).send({ success: false, error: { code: "EMAIL_FAILED", message: "Failed to send email" } });
        return;
      }

      await prisma.auditLog.create({
        data: {
          entityType: "patrol_report",
          entityId: siteId || "all-sites",
          action: "patrol_report_email_sent",
          newValues: JSON.stringify({ recipient: email, format, siteName: siteName || null }),
          performedBy: request.user!.userId,
        },
      });

      reply.code(200).send({ success: true, data: { message: `Patrol report for ${reportLabel} sent successfully` } });
    } else {
      const headers = ["Date", "Site", "Guard", "Duration", "Checkpoints", "Status", "Notes"];

      const rows = patrols.map((p) => {
        const start = new Date(p.startedAt);
        const end = p.completedAt ? new Date(p.completedAt) : null;
        const durationMs = end ? end.getTime() - start.getTime() : null;
        const durationStr = durationMs
          ? `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`
          : "In progress";

        return [
          sanitizeCsv(start.toISOString().split("T")[0]),
          sanitizeCsv(p.siteName),
          sanitizeCsv(p.guardName),
          sanitizeCsv(durationStr),
          sanitizeCsv(String(p.checkpointCount)),
          sanitizeCsv(p.status),
          sanitizeCsv(p.notes || ""),
        ];
      });

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress: reportLabel,
          incidentType: "Patrol Report",
        },
        attachments: [{ filename, content: csv }],
      });

      if (result.error) {
        reply.code(500).send({ success: false, error: { code: "EMAIL_FAILED", message: "Failed to send email" } });
        return;
      }

      await prisma.auditLog.create({
        data: {
          entityType: "patrol_report",
          entityId: siteId || "all-sites",
          action: "patrol_report_email_sent",
          newValues: JSON.stringify({ recipient: email, format, siteName: siteName || null }),
          performedBy: request.user!.userId,
        },
      });

      reply.code(200).send({ success: true, data: { message: `Patrol report for ${reportLabel} sent successfully` } });
    }
  },
};
