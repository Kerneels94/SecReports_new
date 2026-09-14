/**
 * Export controller — handles data export (CSV and PDF) for incidents.
 * Requires the "export_csv_pdf" subscription feature.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/db";
import { AuditLogService } from "../services/auditLog.service";
import { SubscriptionService } from "../services/subscription.service";
import { sendMail } from "../services/email.service";

interface IncidentForExport {
  referenceNumber: string;
  title: string;
  description: string;
  type: string;
  status: string;
  incidentDate: Date;
  location: string | null;
  operatorName: string | null;
  dispatcher: string | null;
  dispatchTime: Date | null;
  arrivalTime: Date | null;
  callSign: string | null;
  propertyAddress: string | null;
  clientName: string | null;
  clientCode: string | null;
  businessOrComplex: string | null;
  sapsReference: string | null;
  reporter: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const COLORS = {
  primary: "#0b1e33",
  gray: "#475569",
  dark: "#1e293b",
  light: "#f8fafc",
  border: "#e2e8f0",
  white: "#FFFFFF",
};

const INCIDENT_CSV_HEADERS = [
  "Reference", "Title", "Type", "Report",
  "Date", "Location", "Operator", "Dispatcher", "Reporter", "Created",
];

function sanitizeCsv(val: string): string {
  if (/^[=+\-@]/.test(val)) return `" ${val.replace(/"/g, '""')}"`;
  return `"${val.replace(/"/g, '""')}"`;
}

function drawHeader(doc: typeof PDFDocument.prototype) {
  doc.rect(50, 40, 495, 50).fill(COLORS.primary);
  doc.fillColor(COLORS.white).fontSize(18).font("Helvetica-Bold").text("Incident Report", 60, 52);
  doc.fillColor(COLORS.white).fontSize(9).font("Helvetica").text("Incident Management Platform", 60, 74);
  doc.moveTo(50, 90).lineTo(545, 90).lineWidth(4).strokeColor(COLORS.border).stroke();
  doc.fillColor(COLORS.dark);
}

function drawSection(doc: typeof PDFDocument.prototype, title: string, y: number): number {
  doc.rect(50, y, 495, 22).fillAndStroke(COLORS.light, COLORS.border);
  doc.fillColor(COLORS.dark).fontSize(11).font("Helvetica-Bold").text(title, 60, y + 5);
  return y + 30;
}

function drawField(doc: typeof PDFDocument.prototype, label: string, value: string, y: number): number {
  doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.gray).text(label, 60, y);
  doc.font("Helvetica").fillColor(COLORS.dark).text(value || "-", 175, y);
  return y + 16;
}

async function generatePdf(incidents: IncidentForExport[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      if (i > 0) doc.addPage();

      drawHeader(doc);

      let y = 110;

      doc.fontSize(16).font("Helvetica-Bold").fillColor(COLORS.dark).text(inc.title, 50, y);
      y += 22;
      doc.fontSize(8).font("Helvetica").fillColor(COLORS.gray).text(`Ref: ${inc.referenceNumber}`, 50, y);
      y += 20;

      y = drawSection(doc, "Description", y);
      doc.fontSize(9).font("Helvetica").fillColor(COLORS.dark).text(inc.description || "No description", 60, y, { width: 475, align: "left" });
      y += doc.y - y + 12;

      y = drawSection(doc, "Controllers", y);
      y = drawField(doc, "Operator", inc.operatorName || "-", y);
      y = drawField(doc, "Dispatcher", inc.dispatcher || "-", y);

      if (inc.dispatchTime || inc.arrivalTime || inc.callSign) {
        y = drawSection(doc, "Response", y + 4);
        if (inc.dispatchTime) y = drawField(doc, "Dispatch Time", new Date(inc.dispatchTime).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), y);
        if (inc.arrivalTime) y = drawField(doc, "Arrival Time", new Date(inc.arrivalTime).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), y);
        y = drawField(doc, "Call Sign", inc.callSign || "-", y);
      }

      if (inc.propertyAddress || inc.clientName || inc.clientCode || inc.businessOrComplex || inc.sapsReference) {
        y = drawSection(doc, "Client & Property", y + 4);
        y = drawField(doc, "Property Address", inc.propertyAddress || "-", y);
        y = drawField(doc, "Client Name", inc.clientName || "-", y);
        y = drawField(doc, "Client Code", inc.clientCode || "-", y);
        y = drawField(doc, "Business/Complex", inc.businessOrComplex || "-", y);
        y = drawField(doc, "SAPS Reference", inc.sapsReference || "-", y);
      }

      y = drawSection(doc, "Details", y + 4);
      y = drawField(doc, "Type", inc.type, y);
      y = drawField(doc, "Status", inc.status.replace(/_/g, " "), y);
      y = drawField(doc, "Location", inc.location || "-", y);
      y = drawField(doc, "Incident Date", new Date(inc.incidentDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), y);
      y = drawField(doc, "Reporter", inc.reporter?.name || "Unknown", y);
      y = drawField(doc, "Created", new Date(inc.createdAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), y);
      y = drawField(doc, "Updated", new Date(inc.updatedAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), y);

      doc.fontSize(7).font("Helvetica").fillColor(COLORS.gray).text(`Generated on ${new Date().toLocaleString("en-US")}`, 50, 750, { align: "center" });
    }

    doc.end();
  });
}

interface YearBreakdown {
  year: number;
  count: number;
  attempted: number;
  positive: number;
}

interface TypeBreakdown {
  type: string;
  count: number;
}

interface AreaBreakdown {
  area: string;
  count: number;
  avgMs: number | null;
  maxMs: number | null;
}

/** Draws a vertical bar chart with values above bars and labels below. */
function drawBarChart(
  doc: typeof PDFDocument.prototype,
  data: { label: string; value: number; color?: string }[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const slot = width / data.length;
  const barWidth = Math.min(slot * 0.6, 60);
  const baseY = y + height;

  doc.lineWidth(1).strokeColor(COLORS.border).moveTo(x, baseY).lineTo(x + width, baseY).stroke();

  data.forEach((d, i) => {
    const barHeight = Math.max((d.value / maxValue) * height, d.value > 0 ? 6 : 0);
    const barX = x + slot * i + (slot - barWidth) / 2;

    doc.rect(barX, baseY - barHeight, barWidth, barHeight).fill(d.color || COLORS.primary);
    doc.fillColor(COLORS.gray).fontSize(8).text(String(d.value), barX, baseY - barHeight - 12, { width: barWidth, align: "center" });
    doc.fillColor(COLORS.dark).fontSize(8).text(d.label, barX, baseY + 4, { width: barWidth, align: "center" });
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  const totalSec = Math.round(ms / 1000);
  return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}

/** Returns y on a new page if content would overflow, otherwise unchanged. */
function pageSpace(doc: typeof PDFDocument.prototype, y: number, needed: number): number {
  if (y + needed > doc.page.height - 60) {
    doc.addPage();
    return 50;
  }
  return y;
}

function drawTable(
  doc: typeof PDFDocument.prototype,
  cols: { label: string; width: number }[],
  rows: string[][],
  x: number,
  startY: number,
): number {
  const totalWidth = cols.reduce((s, c) => s + c.width, 0);
  const headerH = 20;
  const rowH = 18;
  let y = startY;

  doc.rect(x, startY, totalWidth, headerH).fill(COLORS.primary);
  let cx = x;
  cols.forEach((c) => {
    doc.fillColor(COLORS.white).fontSize(9).font("Helvetica-Bold").text(c.label, cx + 6, startY + 5, { width: c.width - 12 });
    cx += c.width;
  });
  y += headerH;

  rows.forEach((r, i) => {
    if (i % 2 === 1) doc.rect(x, y, totalWidth, rowH).fill(COLORS.light);
    cx = x;
    r.forEach((cell, j) => {
      doc.fillColor(COLORS.dark).fontSize(9).font("Helvetica").text(cell, cx + 6, y + 4, { width: cols[j].width - 12 });
      cx += cols[j].width;
    });
    y += rowH;
  });

  return y;
}

function generateYearlyPdf(data: {
  total: number;
  attempted: number;
  positive: number;
  byYear: YearBreakdown[];
  byType: TypeBreakdown[];
  byArea: AreaBreakdown[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(50, 40, 495, 50).fill(COLORS.primary);
    doc.fillColor(COLORS.white).fontSize(18).font("Helvetica-Bold").text("Crime Statistics Report", 60, 52);
    doc.fillColor(COLORS.white).fontSize(9).font("Helvetica").text("Incident Management Platform", 60, 74);
    doc.moveTo(50, 90).lineTo(545, 90).lineWidth(4).strokeColor(COLORS.border).stroke();
    doc.fillColor(COLORS.dark);

    const summary = [
      { label: "Total Incidents", value: data.total, color: COLORS.primary },
      { label: "Attempted", value: data.attempted, color: "#f59e0b" },
      { label: "Positive", value: data.positive, color: "#10b981" },
    ];
    const boxWidth = 150;
    const boxGap = 22;
    let boxX = 50;
    summary.forEach((s, i) => {
      doc.roundedRect(boxX, 110, boxWidth, 52, 6).fill(COLORS.light);
      doc.rect(boxX, 110, boxWidth, 4).fill(s.color);
      doc.fillColor(COLORS.gray).fontSize(8).text(s.label.toUpperCase(), boxX + 10, 122, { width: boxWidth - 20 });
      doc.fillColor(COLORS.dark).fontSize(20).font("Helvetica-Bold").text(String(s.value), boxX + 10, 134);
      boxX += boxWidth + boxGap;
      if (i === 0) boxX += 10;
    });

    doc.font("Helvetica");

    let y = drawSection(doc, "Incidents by Year", 185);
    if (data.byYear.length === 0) {
      doc.fontSize(9).fillColor(COLORS.gray).text("No incident data available.", 60, y);
    } else {
      const yearData = data.byYear.map((b) => ({ label: String(b.year), value: b.count }));
      drawBarChart(doc, yearData, 60, y + 10, 480, 120);
      y += 150;
    }

    const typeRows = data.byType.map((t) => [t.type, String(t.count)]);
    y = pageSpace(doc, y + 20, 40 + typeRows.length * 18);
    y = drawSection(doc, "Incidents by Type", y + 20);
    y = drawTable(
      doc,
      [
        { label: "Type", width: 380 },
        { label: "Incidents", width: 120 },
      ],
      typeRows,
      60,
      y,
    );

    const areaRows = data.byArea.map((a) => [
      a.area,
      String(a.count),
      formatDuration(a.avgMs),
      formatDuration(a.maxMs),
    ]);
    y = pageSpace(doc, y + 20, 40 + areaRows.length * 18);
    y = drawSection(doc, "Incidents by Area", y + 20);
    y = drawTable(
      doc,
      [
        { label: "Area", width: 170 },
        { label: "Incidents", width: 70 },
        { label: "Avg Response", width: 130 },
        { label: "Longest Response", width: 130 },
      ],
      areaRows,
      60,
      y,
    );

    doc.fontSize(7).font("Helvetica").fillColor(COLORS.gray).text(`Generated on ${new Date().toLocaleString("en-US")}`, 50, 750, { align: "center" });

    doc.end();
  });
}

export const ExportController = {
  /** Export all company incidents as a CSV file download. */
  async csv(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "export_csv_pdf");

    const incidents = await prisma.incident.findMany({
      where: { companyId: request.user!.companyId },
      include: {
        reporter: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = incidents.map((i) => [
      sanitizeCsv(i.referenceNumber),
      sanitizeCsv(i.title),
      sanitizeCsv(i.type),
      sanitizeCsv(""),
      sanitizeCsv(i.incidentDate.toISOString().split("T")[0]),
      sanitizeCsv(i.location || ""),
      sanitizeCsv(i.operatorName || ""),
      sanitizeCsv(i.dispatcher || ""),
      sanitizeCsv(i.reporter?.name || ""),
      sanitizeCsv(i.createdAt.toISOString().split("T")[0]),
    ]);

    const csv = [INCIDENT_CSV_HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\n");

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=incidents.csv");
    reply.code(200).send(csv);
  },

  /** Export a visual yearly crime statistics report as a PDF download. */
  async yearlyPdf(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "export_csv_pdf");

    const incidents = await prisma.incident.findMany({
      where: { companyId: request.user!.companyId },
      select: { incidentDate: true, type: true, propertyAddress: true, dispatchTime: true, arrivalTime: true },
    });

    if (incidents.length === 0) {
      reply.code(404).send({ success: false, error: { code: "NOT_FOUND", message: "No incidents found" } });
      return;
    }

    const byYearMap: Record<string, YearBreakdown> = {};
    const byTypeMap: Record<string, number> = {};
    const byAreaMap: Record<string, { count: number; responded: number; totalMs: number; maxMs: number }> = {};
    let attempted = 0;
    let positive = 0;

    for (const inc of incidents) {
      const year = inc.incidentDate.getFullYear();
      const isAttempted = inc.type.toLowerCase().includes("attempted");
      const isPositive = inc.type.toLowerCase().includes("positive");
      if (isAttempted) attempted++;
      if (isPositive) positive++;

      byYearMap[year] = byYearMap[year] || { year, count: 0, attempted: 0, positive: 0 };
      byYearMap[year].count++;
      if (isAttempted) byYearMap[year].attempted++;
      if (isPositive) byYearMap[year].positive++;

      byTypeMap[inc.type] = (byTypeMap[inc.type] || 0) + 1;

      const area = inc.propertyAddress || "Unknown";
      const entry = byAreaMap[area] || { count: 0, responded: 0, totalMs: 0, maxMs: 0 };
      entry.count++;
      if (inc.dispatchTime && inc.arrivalTime) {
        const ms = inc.arrivalTime.getTime() - inc.dispatchTime.getTime();
        if (ms > 0) {
          entry.responded++;
          entry.totalMs += ms;
          entry.maxMs = Math.max(entry.maxMs, ms);
        }
      }
      byAreaMap[area] = entry;
    }

    const byYear = Object.values(byYearMap).sort((a, b) => b.year - a.year);
    const byType = Object.entries(byTypeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
    const byArea = Object.entries(byAreaMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([area, d]) => ({
        area,
        count: d.count,
        avgMs: d.responded > 0 ? Math.round(d.totalMs / d.responded) : null,
        maxMs: d.maxMs > 0 ? d.maxMs : null,
      }));

    const pdfBuffer = await generateYearlyPdf({
      total: incidents.length,
      attempted,
      positive,
      byYear,
      byType,
      byArea,
    });

    const company = await prisma.company.findUnique({ where: { id: request.user!.companyId } });
    const companySlug = (company?.name || "SecReports").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const date = new Date().toISOString().split("T")[0];

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename=yearly-crime-stats-${companySlug}-${date}.pdf`);
    reply.code(200).send(pdfBuffer);
  },

  /** Export incidents as a PDF file download. Accepts optional `incidentId` query param for a single incident. */
  async pdf(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "export_csv_pdf");

    const query = request.query as { incidentId?: string };
    const where: any = { companyId: request.user!.companyId };
    if (query.incidentId) {
      where.id = query.incidentId;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (incidents.length === 0) {
      reply.code(404).send({ success: false, error: { code: "NOT_FOUND", message: "No incidents found" } });
      return;
    }

    const pdfBuffer = await generatePdf(incidents as IncidentForExport[]);

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename=incident${incidents.length === 1 ? "" : "s"}.pdf`);
    reply.code(200).send(pdfBuffer);
  },

  /** Email all incidents matching a type pattern (attempted/positive) as a batch CSV or PDF attachment. */
  async batchEmail(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "export_csv_pdf");

    const { email, type, format } = request.body as { email: string; type: string; format: "csv" | "pdf" };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      reply.code(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid email address" } });
      return;
    }

    if (type !== "attempted" && type !== "positive") {
      reply.code(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Type must be 'attempted' or 'positive'" } });
      return;
    }

    if (format !== "csv" && format !== "pdf") {
      reply.code(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Format must be 'csv' or 'pdf'" } });
      return;
    }

    const incidents = await prisma.incident.findMany({
      where: {
        companyId: request.user!.companyId,
        type: { contains: type, mode: "insensitive" },
      },
      include: { reporter: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (incidents.length === 0) {
      reply.code(404).send({ success: false, error: { code: "NOT_FOUND", message: `No ${type} incidents found` } });
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: request.user!.companyId! } });
    const companyName = company?.name || "SecReports";

    if (format === "pdf") {
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generatePdf(incidents as IncidentForExport[]);
      } catch {
        reply.code(500).send({ success: false, error: { code: "PDF_FAILED", message: "Failed to generate PDF" } });
        return;
      }
      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress: `${incidents.length} incidents`,
          incidentType: type,
        },
        attachments: [{ filename: `${type}-incidents.pdf`, content: pdfBuffer }],
      });

      if (result.error) {
        reply.code(500).send({ success: false, error: { code: "EMAIL_FAILED", message: "Failed to send email" } });
        return;
      }

      await AuditLogService.create({
          entityType: "incident",
          entityId: "batch",
          action: "report_batch_email_sent",
          newValues: JSON.stringify({ recipient: email, type, format, count: incidents.length }),
          performedBy: request.user!.userId,
        });

      reply.code(200).send({ success: true, data: { message: `Report for ${incidents.length} ${type} incidents sent successfully` } });
    } else {
      const rows = incidents.map((i) => [
        sanitizeCsv(i.referenceNumber),
        sanitizeCsv(i.title),
        sanitizeCsv(i.type),
        sanitizeCsv(""),
        sanitizeCsv(i.incidentDate.toISOString().split("T")[0]),
        sanitizeCsv(i.location || ""),
        sanitizeCsv(i.operatorName || ""),
        sanitizeCsv(i.dispatcher || ""),
        sanitizeCsv(i.reporter?.name || ""),
        sanitizeCsv(i.createdAt.toISOString().split("T")[0]),
      ]);

      const csv = [INCIDENT_CSV_HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\n");

      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress: `${incidents.length} incidents`,
          incidentType: type,
        },
        attachments: [{ filename: `${type}-incidents.csv`, content: csv }],
      });

      if (result.error) {
        reply.code(500).send({ success: false, error: { code: "EMAIL_FAILED", message: "Failed to send email" } });
        return;
      }

      await AuditLogService.create({
          entityType: "incident",
          entityId: "batch",
          action: "report_batch_email_sent",
          newValues: JSON.stringify({ recipient: email, type, format, count: incidents.length }),
          performedBy: request.user!.userId,
        });

      reply.code(200).send({ success: true, data: { message: `Report for ${incidents.length} ${type} incidents sent successfully` } });
    }
  },

  /** Email an incident report as a CSV or PDF attachment to a given email address. */
  async email(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "export_csv_pdf");

    const { incidentId, email, format } = request.body as { incidentId: string; email: string; format: "csv" | "pdf" };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      reply.code(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid email address" } });
      return;
    }

    if (format !== "csv" && format !== "pdf") {
      reply.code(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "Format must be 'csv' or 'pdf'" } });
      return;
    }

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, companyId: request.user!.companyId },
      include: { reporter: { select: { name: true } } },
    });

    if (!incident) {
      reply.code(404).send({ success: false, error: { code: "NOT_FOUND", message: "Incident not found" } });
      return;
    }

    const incidentForExport = incident as IncidentForExport;

    const company = await prisma.company.findUnique({ where: { id: request.user!.companyId! } });
    const companyName = company?.name || "SecReports";

    if (format === "pdf") {
      const pdfBuffer = await generatePdf([incidentForExport]);
      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress: incident.propertyAddress || incident.location || "N/A",
          incidentType: incident.type || "N/A",
        },
        attachments: [{ filename: `incident-${incidentId}.pdf`, content: pdfBuffer }],
      });

      if (result.error) {
        reply.code(500).send({ success: false, error: { code: "EMAIL_FAILED", message: "Failed to send email" } });
        return;
      }

      await AuditLogService.create({
          entityType: "incident",
          entityId: incidentId,
          action: "report_email_sent",
          newValues: JSON.stringify({ recipient: email, format }),
          performedBy: request.user!.userId,
        });

      reply.code(200).send({ success: true, data: { message: "Report sent successfully" } });
    } else {
      const row = [
        sanitizeCsv(incident.referenceNumber),
        sanitizeCsv(incident.title),
        sanitizeCsv(incident.type),
        sanitizeCsv(""),
        sanitizeCsv(incident.incidentDate.toISOString().split("T")[0]),
        sanitizeCsv(incident.location || ""),
        sanitizeCsv(incident.operatorName || ""),
        sanitizeCsv(incident.dispatcher || ""),
        sanitizeCsv(incident.reporter?.name || ""),
        sanitizeCsv(incident.createdAt.toISOString().split("T")[0]),
      ];

      const csv = [INCIDENT_CSV_HEADERS.join(","), row.join(",")].join("\n");

      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress: incident.propertyAddress || incident.location || "N/A",
          incidentType: incident.type || "N/A",
        },
        attachments: [{ filename: `incident-${incidentId}.csv`, content: csv }],
      });

      if (result.error) {
        reply.code(500).send({ success: false, error: { code: "EMAIL_FAILED", message: "Failed to send email" } });
        return;
      }

      await AuditLogService.create({
          entityType: "incident",
          entityId: incidentId,
          action: "report_email_sent",
          newValues: JSON.stringify({ recipient: email, format }),
          performedBy: request.user!.userId,
        });

      reply.code(200).send({ success: true, data: { message: "Report sent successfully" } });
    }
  },
};
