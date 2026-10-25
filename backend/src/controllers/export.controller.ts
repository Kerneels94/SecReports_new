/**
 * Export controller — handles data export (CSV and PDF) for incidents.
 * Requires the "export_csv_pdf" subscription feature.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/db";
import { AuditLogService } from "../services/auditLog.service";
import { ReportService } from "../services/report.service";
import { SubscriptionService } from "../services/subscription.service";
import { sendMail } from "../services/email.service";
import { BRAND } from "../templates/layout";
import {
  emailReportSchema,
  batchEmailSchema,
} from "../validators/export.schema";
import { ValidationError } from "../lib/errors";

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

/** Corner radius for counter cards and table panels. */
const RADIUS = 8;

/** Zinc-800 page background on the first page and every page added later. */
function newDoc(): typeof PDFDocument.prototype {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const paint = () =>
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.page);
  paint();
  doc.on("pageAdded", paint);
  return doc;
}

const INCIDENT_CSV_HEADERS = [
  "Reference",
  "Title",
  "Type",
  "Report",
  "Date",
  "Location",
  "Operator",
  "Dispatcher",
  "Reporter",
  "Created",
];

function sanitizeCsv(val: string): string {
  if (/^[=+\-@\t\r]/.test(val)) return `" ${val.replace(/"/g, '""')}"`;
  return `"${val.replace(/"/g, '""')}"`;
}

/** Brand header: zinc block, wordmark, uppercase tagline, 4px rule. */
function drawHeader(doc: typeof PDFDocument.prototype): number {
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

/** Brand footer: green strip, copyright, automated-notice line. */
function drawFooter(doc: typeof PDFDocument.prototype) {
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

function drawSection(
  doc: typeof PDFDocument.prototype,
  title: string,
  y: number,
): number {
  doc
    .fillColor(COLORS.dark)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(title, 50, y + 5, { width: 495, align: "center" });
  return y + 30;
}

function drawField(
  doc: typeof PDFDocument.prototype,
  label: string,
  value: string,
  y: number,
): number {
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(COLORS.gray)
    .text(label, 60, y);
  doc
    .font("Helvetica")
    .fillColor(COLORS.dark)
    .text(value || "-", 175, y);
  return y + 16;
}

async function generatePdf(incidents: IncidentForExport[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = newDoc();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      if (i > 0) doc.addPage();

      let y = drawHeader(doc) + 10;

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor(COLORS.dark)
        .text(inc.title, 50, y, { width: 495, align: "center" });
      y += 24;
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(COLORS.muted)
        .text(`Ref: ${inc.referenceNumber}`, 50, y, {
          width: 495,
          align: "center",
        });
      y += 20;

      y = drawSection(doc, "Description", y);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(COLORS.dark)
        .text(inc.description || "No description", 60, y, {
          width: 475,
          align: "left",
        });
      y += doc.y - y + 12;

      y = drawSection(doc, "Controllers", y);
      y = drawField(doc, "Operator", inc.operatorName || "-", y);
      y = drawField(doc, "Dispatcher", inc.dispatcher || "-", y);

      if (inc.dispatchTime || inc.arrivalTime || inc.callSign) {
        y = drawSection(doc, "Response", y + 4);
        if (inc.dispatchTime)
          y = drawField(
            doc,
            "Dispatch Time",
            new Date(inc.dispatchTime).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Johannesburg",
            }),
            y,
          );
        if (inc.arrivalTime)
          y = drawField(
            doc,
            "Arrival Time",
            new Date(inc.arrivalTime).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Johannesburg",
            }),
            y,
          );
        y = drawField(doc, "Call Sign", inc.callSign || "-", y);
      }

      if (
        inc.propertyAddress ||
        inc.clientName ||
        inc.clientCode ||
        inc.businessOrComplex ||
        inc.sapsReference
      ) {
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
      y = drawField(
        doc,
        "Incident Date",
        new Date(inc.incidentDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        y,
      );
      y = drawField(doc, "Reporter", inc.reporter?.name || "Unknown", y);
      y = drawField(
        doc,
        "Created",
        new Date(inc.createdAt).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        y,
      );
      y = drawField(
        doc,
        "Updated",
        new Date(inc.updatedAt).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        y,
      );

      drawFooter(doc);
    }

    doc.end();
  });
}

interface YearBreakdown {
  year: number;
  count: number;
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

  doc
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .moveTo(x, baseY)
    .lineTo(x + width, baseY)
    .stroke();

  data.forEach((d, i) => {
    const barHeight = Math.max(
      (d.value / maxValue) * height,
      d.value > 0 ? 6 : 0,
    );
    const barX = x + slot * i + (slot - barWidth) / 2;

    doc
      .rect(barX, baseY - barHeight, barWidth, barHeight)
      .fill(d.color || COLORS.accent);
    doc
      .fillColor(COLORS.gray)
      .fontSize(8)
      .text(String(d.value), barX, baseY - barHeight - 12, {
        width: barWidth,
        align: "center",
      });
    doc
      .fillColor(COLORS.dark)
      .fontSize(8)
      .text(d.label, barX, baseY + 4, { width: barWidth, align: "center" });
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "-";
  // floor, not round, so this agrees with the dashboard's formatDurationMs — otherwise the
  // same 23.999s incident renders as two different durations in the PDF and the UI.
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}

/** Returns y on a new page if content would overflow, otherwise unchanged. */
function pageSpace(
  doc: typeof PDFDocument.prototype,
  y: number,
  needed: number,
): number {
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
  const tableH = headerH + rows.length * rowH;

  // Panel-style table: fills are clipped to a rounded table outline so the whole
  // table (not just the header) carries the corner radius.
  doc.save();
  doc.roundedRect(x, startY, totalWidth, tableH, RADIUS).clip();
  doc.rect(x, startY, totalWidth, headerH).fill(COLORS.border);
  let y = startY + headerH;
  rows.forEach((r, i) => {
    if (i % 2 === 1) doc.rect(x, y, totalWidth, rowH).fill(COLORS.light);
    y += rowH;
  });
  doc.restore();
  doc.roundedRect(x, startY, totalWidth, tableH, RADIUS).stroke(COLORS.border);

  let cx = x;
  cols.forEach((c) => {
    doc
      .fillColor(COLORS.white)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(c.label, cx + 6, startY + 5, { width: c.width - 12 });
    cx += c.width;
  });
  y = startY + headerH;

  rows.forEach((r, i) => {
    cx = x;
    r.forEach((cell, j) => {
      doc
        .fillColor(COLORS.dark)
        .fontSize(9)
        .font("Helvetica")
        .text(cell, cx + 6, y + 4, { width: cols[j].width - 12 });
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
    const doc = newDoc();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const y0 = drawHeader(doc);

    doc
      .fillColor(COLORS.dark)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Crime Statistics Report", 50, y0, { width: 495, align: "center" });
    doc
      .fillColor(COLORS.muted)
      .fontSize(9)
      .font("Helvetica")
      .text(`Generated on ${new Date().toLocaleString("en-US")}`, 50, y0 + 24, {
        width: 495,
        align: "center",
      });

    const summary = [
      { label: "Total Incidents", value: data.total, color: COLORS.accent },
      { label: "Attempted", value: data.attempted, color: "#f59e0b" },
      { label: "Positive", value: data.positive, color: "#10b981" },
    ];
    const boxWidth = 150;
    const boxGap = 22.5;
    let boxX = 50;
    const boxY = y0 + 48;
    summary.forEach((s) => {
      // Shadow: this card's strip colour at 50%, offset behind it. The page-colour
      // fill on the card itself masks the overlap so only the outer band shows.
      doc.fillColor(s.color, 0.5);
      doc.roundedRect(boxX + 3, boxY + 3, boxWidth, 52, RADIUS).fill();
      // Strip clipped to the card so its corners follow the card radius, not stick out square.
      doc.save();
      doc.roundedRect(boxX, boxY, boxWidth, 52, RADIUS).clip();
      doc.rect(boxX, boxY, boxWidth, 4).fill(s.color);
      doc.restore();
      doc.fillColor(COLORS.page, 1);
      doc
        .roundedRect(boxX, boxY, boxWidth, 52, RADIUS)
        .fillAndStroke(COLORS.page, COLORS.border);
      doc
        .fillColor(COLORS.gray)
        .fontSize(8)
        .text(s.label.toUpperCase(), boxX + 10, boxY + 12, {
          width: boxWidth - 20,
        });
      doc
        .fillColor(COLORS.dark)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(String(s.value), boxX + 10, boxY + 24);
      boxX += boxWidth + boxGap;
    });

    doc.font("Helvetica");

    const yearRows = data.byYear.map((b) => [String(b.year), String(b.count)]);
    let y = pageSpace(doc, boxY + 95, 40 + yearRows.length * 18);
    y = drawSection(doc, "Incidents by Year", y);
    y = drawTable(
      doc,
      [
        { label: "Year", width: 375 },
        { label: "Incidents", width: 120 },
      ],
      yearRows,
      50,
      y,
    );

    const typeRows = data.byType.map((t) => [t.type, String(t.count)]);
    y = pageSpace(doc, y + 20, 40 + typeRows.length * 18);
    y = drawSection(doc, "Incidents by Type", y + 20);
    y = drawTable(
      doc,
      [
        { label: "Type", width: 375 },
        { label: "Incidents", width: 120 },
      ],
      typeRows,
      50,
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
        { label: "Area", width: 165 },
        { label: "Incidents", width: 70 },
        { label: "Avg Response", width: 130 },
        { label: "Longest Response", width: 130 },
      ],
      areaRows,
      50,
      y,
    );

    drawFooter(doc);

    doc.end();
  });
}

/** Average response time report over a 3/6/9/12-month window: headline boxes, monthly bar chart, per-month table. */
function generateResponseTimePdf(data: {
  months: number;
  from: Date;
  perMonth: {
    month: string;
    count: number;
    avgMs: number;
    medianMs: number;
    p90Ms: number;
  }[];
  overall: { count: number; avgMs: number; medianMs: number; p90Ms: number };
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = newDoc();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const y0 = drawHeader(doc);
    const longDate = (d: Date) =>
      d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

    doc
      .fillColor(COLORS.dark)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Average Response Time Report", 50, y0, {
        width: 495,
        align: "center",
      });
    doc
      .fillColor(COLORS.muted)
      .fontSize(9)
      .font("Helvetica")
      .text(
        `Last ${data.months} months (${longDate(data.from)} - ${longDate(new Date())})`,
        50,
        y0 + 24,
        { width: 495, align: "center" },
      );

    const summary = [
      {
        label: "Avg Response",
        value: formatDuration(data.overall.avgMs),
        color: COLORS.accent,
      },
      {
        label: "Median Response",
        value: formatDuration(data.overall.medianMs),
        color: "#10b981",
      },
      {
        label: "90th Percentile",
        value: formatDuration(data.overall.p90Ms),
        color: "#f59e0b",
      },
    ];
    const boxWidth = 150;
    const boxGap = 22.5;
    let boxX = 50;
    const boxY = y0 + 48;
    summary.forEach((s) => {
      // Shadow: this card's strip colour at 50%, offset behind it. The page-colour
      // fill on the card itself masks the overlap so only the outer band shows.
      doc.fillColor(s.color, 0.5);
      doc.roundedRect(boxX + 3, boxY + 3, boxWidth, 52, RADIUS).fill();
      // Strip clipped to the card so its corners follow the card radius, not stick out square.
      doc.save();
      doc.roundedRect(boxX, boxY, boxWidth, 52, RADIUS).clip();
      doc.rect(boxX, boxY, boxWidth, 4).fill(s.color);
      doc.restore();
      doc.fillColor(COLORS.page, 1);
      doc
        .roundedRect(boxX, boxY, boxWidth, 52, RADIUS)
        .fillAndStroke(COLORS.page, COLORS.border);
      doc
        .fillColor(COLORS.gray)
        .fontSize(8)
        .text(s.label.toUpperCase(), boxX + 10, boxY + 12, {
          width: boxWidth - 20,
        });
      doc
        .fillColor(COLORS.dark)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(s.value, boxX + 10, boxY + 24);
      boxX += boxWidth + boxGap;
    });

    doc.font("Helvetica");

    let y = drawSection(doc, "Average Response Time by Month", boxY + 75);
    drawBarChart(
      doc,
      // "26-07" rather than "2026-07": a 12-bar chart leaves ~24px per slot, and the full
      // year wraps across two lines. The exact range is spelled out under the title.
      // Bar heights use minutes to one decimal so a sub-minute month still shows a bar;
      // the table below carries the exact seconds.
      data.perMonth.map((m) => ({
        label: m.month.slice(2),
        value: Math.round((m.avgMs / 60000) * 10) / 10,
      })),
      50,
      y + 10,
      495,
      120,
    );
    y += 150;

    const monthRows = [
      ...data.perMonth.map((m) => [
        m.month,
        String(m.count),
        formatDuration(m.avgMs),
        formatDuration(m.medianMs),
        formatDuration(m.p90Ms),
      ]),
      // Trailing total so the headline figures are checkable against the month rows.
      [
        "All months",
        String(data.overall.count),
        formatDuration(data.overall.avgMs),
        formatDuration(data.overall.medianMs),
        formatDuration(data.overall.p90Ms),
      ],
    ];
    y = pageSpace(doc, y + 20, 40 + monthRows.length * 18);
    y = drawSection(doc, "Monthly Breakdown", y + 20);
    drawTable(
      doc,
      [
        { label: "Month", width: 120 },
        { label: "Incidents", width: 80 },
        { label: "Avg Response", width: 100 },
        { label: "Median", width: 90 },
        { label: "90th Percentile", width: 105 },
      ],
      monthRows,
      50,
      y,
    );

    drawFooter(doc);

    doc.end();
  });
}

export const ExportController = {
  /** Export all company incidents as a CSV file download. */
  async csv(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(
      request.user!.companyId,
      "export_csv_pdf",
    );

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

    const csv = [
      INCIDENT_CSV_HEADERS.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=incidents.csv");
    reply.code(200).send(csv);
  },

  /** Export the last 3/6/9/12-month average response time report as a PDF download. */
  async responseTimePdf(request: FastifyRequest, reply: FastifyReply) {
    const companyId = request.user!.companyId;
    await SubscriptionService.requireFeature(companyId, "export_csv_pdf");

    const months =
      Number((request.query as { months?: string | number }).months) || 12;
    const report = await ReportService.responseTimeReport(companyId, months);

    // Guard on overall, not perMonth: overall is what the PDF dereferences, so checking it
    // directly removes the need for a non-null assertion on the line below.
    if (report.perMonth.length === 0 || !report.overall) {
      reply.code(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "No response time data for the selected period",
        },
      });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    const companySlug = (company?.name || "SecReports")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const date = new Date().toISOString().split("T")[0];

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateResponseTimePdf({
        months: report.months,
        from: report.from,
        perMonth: report.perMonth,
        overall: report.overall,
      });
    } catch {
      reply.code(500).send({
        success: false,
        error: { code: "PDF_FAILED", message: "Failed to generate PDF" },
      });
      return;
    }

    // Data egress: a report leaving the system is worth an audit trail (golden rule #35/#36).
    await AuditLogService.create({
      entityType: "report",
      entityId: `response-time-${months}m`,
      action: "report_response_time_exported",
      performedBy: request.user!.userId,
    });

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `attachment; filename=avg-response-time-${months}m-${companySlug}-${date}.pdf`,
    );
    reply.code(200).send(pdfBuffer);
  },

  /** Export a visual yearly crime statistics report as a PDF download. */
  async yearlyPdf(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(
      request.user!.companyId,
      "export_csv_pdf",
    );

    const incidents = await prisma.incident.findMany({
      where: { companyId: request.user!.companyId },
      select: {
        incidentDate: true,
        type: true,
        propertyAddress: true,
        dispatchTime: true,
        arrivalTime: true,
      },
    });

    if (incidents.length === 0) {
      reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "No incidents found" },
      });
      return;
    }

    const byYearMap: Record<number, number> = {};
    const byTypeMap: Record<string, number> = {};
    const byAreaMap: Record<
      string,
      { count: number; responded: number; totalMs: number; maxMs: number }
    > = {};
    let attempted = 0;
    let positive = 0;

    for (const inc of incidents) {
      const year = inc.incidentDate.getFullYear();
      const isAttempted = inc.type.toLowerCase().includes("attempted");
      const isPositive = inc.type.toLowerCase().includes("positive");
      if (isAttempted) attempted++;
      if (isPositive) positive++;

      byYearMap[year] = (byYearMap[year] || 0) + 1;

      byTypeMap[inc.type] = (byTypeMap[inc.type] || 0) + 1;

      const area = inc.propertyAddress || "Unknown";
      const entry = byAreaMap[area] || {
        count: 0,
        responded: 0,
        totalMs: 0,
        maxMs: 0,
      };
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

    const byYear = Object.entries(byYearMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, count]) => ({ year: Number(year), count }));
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

    const company = await prisma.company.findUnique({
      where: { id: request.user!.companyId },
    });
    const companySlug = (company?.name || "SecReports")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const date = new Date().toISOString().split("T")[0];

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `attachment; filename=yearly-crime-stats-${companySlug}-${date}.pdf`,
    );
    reply.code(200).send(pdfBuffer);
  },

  /** Export one incident as a PDF file download. */
  async pdf(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(
      request.user!.companyId,
      "export_csv_pdf",
    );

    const query = request.query as { incidentId?: string };
    if (!query.incidentId) {
      reply.code(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "incidentId is required" },
      });
      return;
    }

    const incident = await prisma.incident.findFirst({
      where: { id: query.incidentId, companyId: request.user!.companyId },
      include: {
        reporter: { select: { name: true } },
      },
    });

    if (!incident) {
      reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Incident not found" },
      });
      return;
    }

    const pdfBuffer = await generatePdf([incident as IncidentForExport]);

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `attachment; filename=incident-${incident.referenceNumber}.pdf`,
    );
    reply.code(200).send(pdfBuffer);
  },

  /** Email all incidents matching a type pattern (attempted/positive) as a batch CSV or PDF attachment. */
  async batchEmail(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(
      request.user!.companyId,
      "export_csv_pdf",
    );

    const parsed = batchEmailSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());
    const { email, type, format } = parsed.data;

    const incidents = await prisma.incident.findMany({
      where: {
        companyId: request.user!.companyId,
        type: { contains: type, mode: "insensitive" },
      },
      include: { reporter: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      // ponytail: hard cap so a large company can't stall PDF rendering or blow past mail limits
      take: 500,
    });

    if (incidents.length === 0) {
      reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: `No ${type} incidents found` },
      });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: request.user!.companyId! },
    });
    const companyName = company?.name || "SecReports";

    if (format === "pdf") {
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generatePdf(incidents as IncidentForExport[]);
      } catch {
        reply.code(500).send({
          success: false,
          error: { code: "PDF_FAILED", message: "Failed to generate PDF" },
        });
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
        attachments: [
          {
            filename: `${type}-incidents.pdf`,
            content: pdfBuffer,
            applicationType: "application/pdf",
          },
        ],
      });

      if (result.error) {
        reply.code(500).send({
          success: false,
          error: { code: "EMAIL_FAILED", message: "Failed to send email" },
        });
        return;
      }

      await AuditLogService.create({
        entityType: "incident",
        entityId: "batch",
        action: "report_batch_email_sent",
        newValues: JSON.stringify({
          recipient: email,
          type,
          format,
          count: incidents.length,
        }),
        performedBy: request.user!.userId,
      });

      reply.code(200).send({
        success: true,
        data: {
          message: `Report for ${incidents.length} ${type} incidents sent successfully`,
        },
      });
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

      const csv = [
        INCIDENT_CSV_HEADERS.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");

      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress: `${incidents.length} incidents`,
          incidentType: type,
        },
        attachments: [
          {
            filename: `${type}-incidents.csv`,
            content: csv,
            applicationType: "application/csv",
          },
        ],
      });

      if (result.error) {
        reply.code(500).send({
          success: false,
          error: { code: "EMAIL_FAILED", message: "Failed to send email" },
        });
        return;
      }

      await AuditLogService.create({
        entityType: "incident",
        entityId: "batch",
        action: "report_batch_email_sent",
        newValues: JSON.stringify({
          recipient: email,
          type,
          format,
          count: incidents.length,
        }),
        performedBy: request.user!.userId,
      });

      reply.code(200).send({
        success: true,
        data: {
          message: `Report for ${incidents.length} ${type} incidents sent successfully`,
        },
      });
    }
  },

  /** Email an incident report as a CSV or PDF attachment to a given email address. */
  async email(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(
      request.user!.companyId,
      "export_csv_pdf",
    );

    const parsed = emailReportSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError("Invalid input", parsed.error.flatten());
    const { incidentId, email, format } = parsed.data;

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, companyId: request.user!.companyId },
      include: { reporter: { select: { name: true } } },
    });

    if (!incident) {
      reply.code(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Incident not found" },
      });
      return;
    }

    const incidentForExport = incident as IncidentForExport;

    const company = await prisma.company.findUnique({
      where: { id: request.user!.companyId! },
    });
    const companyName = company?.name || "SecReports";

    if (format === "pdf") {
      const pdfBuffer = await generatePdf([incidentForExport]);
      const result = await sendMail({
        to: email,
        subject: "report",
        data: {
          companyName,
          incidentAddress:
            incident.propertyAddress || incident.location || "N/A",
          incidentType: incident.type || "N/A",
        },
        attachments: [
          {
            filename: `incident-${incidentId}.pdf`,
            content: pdfBuffer,
            applicationType: "application/pdf",
          },
        ],
      });

      if (result.error) {
        reply.code(500).send({
          success: false,
          error: { code: "EMAIL_FAILED", message: "Failed to send email" },
        });
        return;
      }

      await AuditLogService.create({
        entityType: "incident",
        entityId: incidentId,
        action: "report_email_sent",
        newValues: JSON.stringify({ recipient: email, format }),
        performedBy: request.user!.userId,
      });

      reply
        .code(200)
        .send({ success: true, data: { message: "Report sent successfully" } });
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
          incidentAddress:
            incident.propertyAddress || incident.location || "N/A",
          incidentType: incident.type || "N/A",
        },
        attachments: [
          {
            filename: `incident-${incidentId}.csv`,
            content: csv,
            applicationType: "application/csv",
          },
        ],
      });

      if (result.error) {
        reply.code(500).send({
          success: false,
          error: { code: "EMAIL_FAILED", message: "Failed to send email" },
        });
        return;
      }

      await AuditLogService.create({
        entityType: "incident",
        entityId: incidentId,
        action: "report_email_sent",
        newValues: JSON.stringify({ recipient: email, format }),
        performedBy: request.user!.userId,
      });

      reply
        .code(200)
        .send({ success: true, data: { message: "Report sent successfully" } });
    }
  },
};
