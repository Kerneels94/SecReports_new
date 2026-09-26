import { ExportController } from "./export.controller";
import { prisma } from "../lib/db";
import { ReportService } from "../services/report.service";
import { SubscriptionService } from "../services/subscription.service";
import { AuditLogService } from "../services/auditLog.service";
import zlib from "zlib";

/** Inflates a PDF's Flate content streams and pulls out the drawn text runs. */
function pdfText(buf: Buffer): string {
  const raw = buf.toString("latin1");
  const out: string[] = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    let stream: string;
    try {
      stream = zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      continue; // not a Flate stream (e.g. embedded font data)
    }
    out.push(
      stream
        // A TJ array is [<hex text> <kern> <hex text> ...]. Only the bare numbers are kern
        // offsets, so skip the hex operands (whose digits are text) when stripping them.
        .replace(/\[([^\]]*)\]\s*TJ/g, (_, runs: string) =>
          runs.replace(/<[^>]*>|-?\d+/g, (m: string) => (m[0] === "<" ? m : "")),
        )
        // Then decode the hex operands. PDF kerning splits words across runs, so dropping
        // the offsets above lets the split words rejoin.
        .replace(/<([0-9a-fA-F\s]+)>/g, (_, hex: string) =>
          Buffer.from(hex.replace(/\s/g, ""), "hex").toString("latin1"),
        ),
    );
  }
  return out.join("\n");
}

jest.mock("../lib/db", () => ({
  prisma: {
    incident: { findMany: jest.fn() },
    company: { findUnique: jest.fn() },
  },
}));

jest.mock("../services/subscription.service", () => ({
  SubscriptionService: { requireFeature: jest.fn() },
}));

jest.mock("../services/report.service", () => ({
  ReportService: { responseTimeReport: jest.fn() },
}));

jest.mock("../services/auditLog.service", () => ({
  AuditLogService: { create: jest.fn() },
}));

describe("ExportController.yearlyPdf", () => {
  const reply = {
    header: jest.fn(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const request = {
    user: { companyId: "company1", userId: "user1" },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.company.findUnique as jest.Mock).mockResolvedValue({ name: "Acme Security" });
  });

  it("generates a PDF of yearly crime statistics", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
        dispatchTime: new Date("2026-05-01T10:00:00Z"),
        arrivalTime: new Date("2026-05-01T10:12:00Z"),
      },
      {
        incidentDate: new Date("2026-03-01"),
        type: "positive",
        propertyAddress: "123 Main St",
        dispatchTime: new Date("2026-03-01T09:00:00Z"),
        arrivalTime: new Date("2026-03-01T09:00:30Z"),
      },
      {
        incidentDate: new Date("2025-12-20"),
        type: "attempted",
        propertyAddress: "456 Oak Ave",
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    expect(prisma.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company1" } }),
    );
    expect(SubscriptionService.requireFeature).toHaveBeenCalledWith("company1", "export_csv_pdf");
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringMatching(/^attachment; filename=yearly-crime-stats-acme-security-\d{4}-\d{2}-\d{2}\.pdf$/),
    );
    expect(reply.send.mock.calls[0][0]).toBeInstanceOf(Buffer);
    expect(reply.send.mock.calls[0][0].length).toBeGreaterThan(1000);
  });

  it("uses the shared email brand header and footer", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    // PDF kerning splits text mid-word, so compare whitespace-insensitively
    const text = pdfText(reply.send.mock.calls[0][0]).replace(/\s+/g, "");
    for (const expected of [
      "SecReports",
      "INCIDENT MANAGEMENT PLATFORM",
      "Crime Statistics Report",
      "All rights reserved",
      "automated notification",
    ]) {
      expect(text).toContain(expected.replace(/\s+/g, ""));
    }
  });

  it("returns 404 when no incidents exist", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);

    await ExportController.yearlyPdf(request, reply as any);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});

describe("ExportController.responseTimePdf", () => {
  const reply = {
    header: jest.fn(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const request = {
    user: { companyId: "company1", userId: "user1" },
    query: { months: 3 },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.company.findUnique as jest.Mock).mockResolvedValue({ name: "Acme Security" });
    (ReportService.responseTimeReport as jest.Mock).mockResolvedValue({
      months: 3,
      from: new Date("2026-07-01T00:00:00Z"),
      perMonth: [
        { month: "2026-07", count: 2, avgMs: 1800000, medianMs: 1800000, p90Ms: 2100000 },
        { month: "2026-08", count: 1, avgMs: 600000, medianMs: 600000, p90Ms: 600000 },
      ],
      overall: { count: 3, avgMs: 1400000, medianMs: 1500000, p90Ms: 2100000 },
    });
  });

  it("generates a PDF of the average response time report", async () => {
    await ExportController.responseTimePdf(request, reply as any);

    expect(ReportService.responseTimeReport).toHaveBeenCalledWith("company1", 3);
    expect(SubscriptionService.requireFeature).toHaveBeenCalledWith("company1", "export_csv_pdf");
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringMatching(/^attachment; filename=avg-response-time-3m-acme-security-\d{4}-\d{2}-\d{2}\.pdf$/),
    );
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send.mock.calls[0][0]).toBeInstanceOf(Buffer);
    expect(reply.send.mock.calls[0][0].length).toBeGreaterThan(1000);
  });

  it("uses the shared brand header, footer, sections and per-month figures", async () => {
    await ExportController.responseTimePdf(request, reply as any);

    // PDF kerning splits text mid-word, so compare whitespace-insensitively
    const text = pdfText(reply.send.mock.calls[0][0]).replace(/\s+/g, "");
    for (const expected of [
      "SecReports",
      "INCIDENT MANAGEMENT PLATFORM",
      "Average Response Time Report",
      "Last 3 months",
      "AVGRESPONSE",
      "MEDIANRESPONSE",
      "90THPERCENTILE",
      "Average Response Time by Month",
      "Monthly Breakdown",
      "2026-07",
      "2026-08",
      "Allmonths",
      // formatDuration output, matching the yearly crime stats PDF
      "23m20s",
      "30m0s",
      "10m0s",
      "25m0s",
      "35m0s",
      "All rights reserved",
      "automated notification",
    ]) {
      expect(text).toContain(expected.replace(/\s+/g, ""));
    }
  });

  it("renders a sub-minute average as seconds rather than zero", async () => {
    (ReportService.responseTimeReport as jest.Mock).mockResolvedValue({
      months: 3,
      from: new Date("2026-07-01T00:00:00Z"),
      perMonth: [{ month: "2026-07", count: 1, avgMs: 24000, medianMs: 24000, p90Ms: 24000 }],
      overall: { count: 1, avgMs: 24000, medianMs: 24000, p90Ms: 24000 },
    });

    await ExportController.responseTimePdf(request, reply as any);

    const text = pdfText(reply.send.mock.calls[0][0]).replace(/\s+/g, "");
    expect(text).toContain("0m24s");
  });

  it("records the export in the audit log against the acting user", async () => {
    await ExportController.responseTimePdf(request, reply as any);

    expect(AuditLogService.create).toHaveBeenCalledWith({
      entityType: "report",
      entityId: "response-time-3m",
      action: "report_response_time_exported",
      performedBy: "user1",
    });
  });

  it("checks the subscription feature before reading any incident data", async () => {
    await ExportController.responseTimePdf(request, reply as any);

    expect(SubscriptionService.requireFeature).toHaveBeenCalledWith("company1", "export_csv_pdf");
    expect(prisma.incident.findMany).not.toHaveBeenCalled();
  });

  it("defaults to 12 months when no period is given", async () => {
    await ExportController.responseTimePdf({ ...request, query: {} } as any, reply as any);

    expect(ReportService.responseTimeReport).toHaveBeenCalledWith("company1", 12);
  });

  it("does not audit a 404, since no data left the system", async () => {
    (ReportService.responseTimeReport as jest.Mock).mockResolvedValue({
      months: 3,
      from: new Date("2026-07-01T00:00:00Z"),
      perMonth: [],
      overall: null,
    });

    await ExportController.responseTimePdf(request, reply as any);

    expect(AuditLogService.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the period has no response time data", async () => {
    (ReportService.responseTimeReport as jest.Mock).mockResolvedValue({
      months: 3,
      from: new Date("2026-07-01T00:00:00Z"),
      perMonth: [],
      overall: null,
    });

    await ExportController.responseTimePdf(request, reply as any);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.header).not.toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});