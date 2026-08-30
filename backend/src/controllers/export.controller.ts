/**
 * Export controller — handles data export (CSV and PDF) for incidents.
 * Requires the "export_csv_pdf" subscription feature.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/db";
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
  primary: "#2962FF",
  gray: "#6B7280",
  dark: "#1F2937",
  light: "#F3F4F6",
  white: "#FFFFFF",
};

function drawHeader(doc: typeof PDFDocument.prototype) {
  doc.rect(50, 40, 495, 50).fill(COLORS.primary);
  doc.fillColor(COLORS.white).fontSize(18).font("Helvetica-Bold").text("Incident Report", 60, 52);
  doc.fillColor(COLORS.white).fontSize(9).font("Helvetica").text("Security Incident Management System", 60, 74);
  doc.fillColor(COLORS.dark);
}

function drawSection(doc: typeof PDFDocument.prototype, title: string, y: number): number {
  doc.rect(50, y, 495, 22).fill(COLORS.light);
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

      y = drawSection(doc, "Personnel", y);
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

    const headers = [
      "Reference", "Title", "Type", "Report",
      "Date", "Location", "Operator", "Dispatcher", "Reporter", "Created",
    ];

    function sanitizeCsv(val: string): string {
      if (/^[=+\-@]/.test(val)) return `" ${val.replace(/"/g, '""')}"`;
      return `"${val.replace(/"/g, '""')}"`;
    }

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

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=incidents.csv");
    reply.code(200).send(csv);
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

      await prisma.auditLog.create({
        data: {
          entityType: "incident",
          entityId: "batch",
          action: "report_batch_email_sent",
          newValues: JSON.stringify({ recipient: email, type, format, count: incidents.length }),
          performedBy: request.user!.userId,
        },
      });

      reply.code(200).send({ success: true, data: { message: `Report for ${incidents.length} ${type} incidents sent successfully` } });
    } else {
      const headers = [
        "Reference", "Title", "Type", "Report",
        "Date", "Location", "Operator", "Dispatcher", "Reporter", "Created",
      ];

      function sanitizeCsv(val: string): string {
        if (/^[=+\-@]/.test(val)) return `" ${val.replace(/"/g, '""')}"`;
        return `"${val.replace(/"/g, '""')}"`;
      }

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

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

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

      await prisma.auditLog.create({
        data: {
          entityType: "incident",
          entityId: "batch",
          action: "report_batch_email_sent",
          newValues: JSON.stringify({ recipient: email, type, format, count: incidents.length }),
          performedBy: request.user!.userId,
        },
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

      await prisma.auditLog.create({
        data: {
          entityType: "incident",
          entityId: incidentId,
          action: "report_email_sent",
          newValues: JSON.stringify({ recipient: email, format }),
          performedBy: request.user!.userId,
        },
      });

      reply.code(200).send({ success: true, data: { message: "Report sent successfully" } });
    } else {
      const headers = [
        "Reference", "Title", "Type", "Report",
        "Date", "Location", "Operator", "Dispatcher", "Reporter", "Created",
      ];

      function sanitizeCsv(val: string): string {
        if (/^[=+\-@]/.test(val)) return `" ${val.replace(/"/g, '""')}"`;
        return `"${val.replace(/"/g, '""')}"`;
      }

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

      const csv = [headers.join(","), row.join(",")].join("\n");

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

      await prisma.auditLog.create({
        data: {
          entityType: "incident",
          entityId: incidentId,
          action: "report_email_sent",
          newValues: JSON.stringify({ recipient: email, format }),
          performedBy: request.user!.userId,
        },
      });

      reply.code(200).send({ success: true, data: { message: "Report sent successfully" } });
    }
  },
};
