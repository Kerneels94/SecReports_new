import { ExportController } from "./export.controller";
import { prisma } from "../lib/db";
import { ReportService } from "../services/report.service";
import { SubscriptionService } from "../services/subscription.service";
import { AuditLogService } from "../services/auditLog.service";
import zlib from "zlib";

/** Inflates a PDF's Flate content streams and returns the raw operators. */
function pdfStreams(buf: Buffer): string[] {
  const raw = buf.toString("latin1");
  const out: string[] = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    try {
      out.push(zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"));
    } catch {
      continue; // not a Flate stream (e.g. embedded font data)
    }
  }
  return out;
}

/** Pulls out the drawn text runs from a PDF's content streams. */
function pdfText(buf: Buffer): string {
  return pdfStreams(buf)
    .map((stream) =>
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
    )
    .join("\n");
}

/** pdfkit emits fills as `<r/255> <g/255> <b/255> scn` with full float precision. */
function fillOp(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${((n >> 16) & 255) / 255} ${((n >> 8) & 255) / 255} ${(n & 255) / 255} scn`;
}

jest.mock("../lib/db", () => ({
  prisma: {
    incident: { findMany: jest.fn(), findFirst: jest.fn() },
    company: { findUnique: jest.fn() },
  },
}));

jest.mock("../services/subscription.service", () => ({
  SubscriptionService: { requireFeature: jest.fn() },
}));

jest.mock("../services/report.service", () => ({
  ReportService: { responseTimeReport: jest.fn(), topSites: jest.fn() },
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

  it("paints the page and banner zinc-800, the footer strip green, and no navy anywhere", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
        dispatchTime: new Date("2026-05-01T10:00:00Z"),
        arrivalTime: new Date("2026-05-01T10:12:00Z"),
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    const content = pdfStreams(reply.send.mock.calls[0][0]).join("\n");
    expect(content).toContain(fillOp("#27272a")); // zinc-800 page + banner
    expect(content).toContain(fillOp("#4ade80")); // app-green footer strip
    expect(content).not.toContain(fillOp("#0b1e33")); // dark blue removed
  });

  it("centers section headings in their strips", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    const content = pdfStreams(reply.send.mock.calls[0][0]).join("\n");
    // Font size 11 is unique to drawSection, so every match is a section heading.
    // A left-aligned heading would start at x=60; centered ones start well past it.
    const starts = [...content.matchAll(/1 0 0 1 ([\d.]+) [\d.]+ Tm\s*\/F\d+ 11 Tf/g)].map((m) => parseFloat(m[1]));
    expect(starts.length).toBeGreaterThanOrEqual(3); // by year, type, area
    for (const x of starts) {
      expect(x).toBeGreaterThan(60);
    }
  });

  it("renders the incidents-by-year section as a two-column table", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      { incidentDate: new Date("2024-05-01"), type: "attempted", propertyAddress: "123 Main St" },
      { incidentDate: new Date("2025-05-01"), type: "attempted", propertyAddress: "123 Main St" },
      { incidentDate: new Date("2026-05-01"), type: "attempted", propertyAddress: "123 Main St" },
      { incidentDate: new Date("2026-06-01"), type: "attempted", propertyAddress: "123 Main St" },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    const text = pdfText(reply.send.mock.calls[0][0]).replace(/\s+/g, "");
    expect(text).toContain("Year"); // two-column table header
    for (const y of ["2024", "2025", "2026"]) expect(text).toContain(y);
  });

  it("paginates large area tables instead of emitting one page per row", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 200 }, (_, i) => ({
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: `Site ${i}`,
      })),
    );

    await ExportController.yearlyPdf(request, reply as any);

    const pdf = reply.send.mock.calls[0][0].toString("latin1");
    const pages = (pdf.match(/\/Type\s*\/Page(?!s)/g) || []).length;
    expect(pages).toBeGreaterThan(1);
    // 200 distinct areas must wrap onto a few pages, not render one page per row.
    expect(pages).toBeLessThan(40);
  });

  it("keeps every drawn block inside the 50-545 content grid", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
        dispatchTime: new Date("2026-05-01T10:00:00Z"),
        arrivalTime: new Date("2026-05-01T10:12:00Z"),
      },
      {
        incidentDate: new Date("2025-12-20"),
        type: "attempted",
        propertyAddress: "456 Oak Ave",
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    const content = pdfStreams(reply.send.mock.calls[0][0]).join("\n");
    const rects = [...content.matchAll(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) re/g)];
    expect(rects.length).toBeGreaterThan(6);
    for (const m of rects) {
      const x = parseFloat(m[1]);
      const w = parseFloat(m[3]);
      if (w > 590) continue; // full-page background
      expect(x).toBeGreaterThanOrEqual(49.9);
      expect(x + w).toBeLessThanOrEqual(548.1); // 545 grid + 3px card shadow
    }
  });

  it("rounds the counter cards and table panels via clipped rounded outlines", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
        dispatchTime: new Date("2026-05-01T10:00:00Z"),
        arrivalTime: new Date("2026-05-01T10:12:00Z"),
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    const content = pdfStreams(reply.send.mock.calls[0][0]).join("\n");
    // one clip per counter card (strip) plus one per table panel = 5
    expect((content.match(/W n/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  it("shadows each counter card with its strip colour at 50% opacity", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-05-01"),
        type: "attempted",
        propertyAddress: "123 Main St",
      },
    ]);

    await ExportController.yearlyPdf(request, reply as any);

    const pdf = reply.send.mock.calls[0][0];
    expect(pdf.toString("latin1")).toContain("/ca 0.5"); // 50% fill-opacity gstate
    expect(pdfStreams(pdf).join("\n")).toMatch(/\/Gs\d+ gs/); // gstate applied in content
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

describe("ExportController.topSitesPdf", () => {
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

  it("generates a PDF of the site ranking", async () => {
    (ReportService.topSites as jest.Mock).mockResolvedValue([
      { site: "1 Main Rd", count: 4 },
      { site: "Mall", count: 2 },
    ]);

    await ExportController.topSitesPdf(request, reply as any);

    expect(SubscriptionService.requireFeature).toHaveBeenCalledWith("company1", "export_csv_pdf");
    expect(ReportService.topSites).toHaveBeenCalledWith("company1", 1000);
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringMatching(/^attachment; filename=sites-with-most-incidents-acme-security-\d{4}-\d{2}-\d{2}\.pdf$/),
    );
    expect(reply.send.mock.calls[0][0]).toBeInstanceOf(Buffer);

    const text = pdfText(reply.send.mock.calls[0][0]).replace(/\s+/g, "");
    expect(text).toContain("SiteswithMostIncidents");
    expect(text).toContain("1MainRd");
    expect(text).toContain("Site");
  });

  it("returns 404 when there are no sites", async () => {
    (ReportService.topSites as jest.Mock).mockResolvedValue([]);

    await ExportController.topSitesPdf(request, reply as any);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("ExportController.monthlyCrimePdf", () => {
  const reply = {
    header: jest.fn(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const request = {
    user: { companyId: "company1", userId: "user1" },
    query: {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.company.findUnique as jest.Mock).mockResolvedValue({ name: "Acme Security" });
  });

  it("filters incidents to the chosen range and renders a monthly report", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      {
        incidentDate: new Date("2026-01-10T10:00:00Z"),
        type: "attempted",
        propertyAddress: "1 Main Rd",
        dispatchTime: new Date("2026-01-10T10:00:00Z"),
        arrivalTime: new Date("2026-01-10T10:05:00Z"),
      },
    ]);

    await ExportController.monthlyCrimePdf(request, reply as any);

    expect(prisma.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company1",
          incidentDate: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
            lte: new Date("2026-02-01T00:00:00.000Z"),
          },
        },
      }),
    );
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringMatching(/^attachment; filename=monthly-crime-stats-acme-security-\d{4}-\d{2}-\d{2}\.pdf$/),
    );

    const text = pdfText(reply.send.mock.calls[0][0]).replace(/\s+/g, "");
    expect(text).toContain("MonthlyCrimeStatisticsReport");
    expect(text).toContain("IncidentsbyMonth");
    expect(text).toContain("Jan2026");
  });

  it("rejects a missing or inverted range", async () => {
    await ExportController.monthlyCrimePdf({ ...request, query: {} } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(400);

    jest.clearAllMocks();
    await ExportController.monthlyCrimePdf(
      { ...request, query: { from: "2026-02-01T00:00:00.000Z", to: "2026-01-01T00:00:00.000Z" } } as any,
      reply as any,
    );
    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it("returns 404 when the range has no incidents", async () => {
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);

    await ExportController.monthlyCrimePdf(request, reply as any);

    expect(reply.code).toHaveBeenCalledWith(404);
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

describe("ExportController.pdf", () => {
  const reply = {
    header: jest.fn(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const request = {
    user: { companyId: "company1", userId: "user1" },
    query: { incidentId: "inc1" },
  } as any;

  const incident = {
    referenceNumber: "INC-1",
    title: "Break-in",
    description: "Forced entry at the rear gate",
    type: "positive",
    status: "open",
    incidentDate: new Date("2026-05-01"),
    location: null,
    operatorName: null,
    dispatcher: null,
    dispatchTime: null,
    arrivalTime: null,
    callSign: null,
    propertyAddress: null,
    clientName: null,
    clientCode: null,
    businessOrComplex: null,
    sapsReference: null,
    reporter: null,
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when incidentId is missing", async () => {
    await ExportController.pdf({ ...request, query: {} } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(prisma.incident.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the incident does not exist", async () => {
    (prisma.incident.findFirst as jest.Mock).mockResolvedValue(null);

    await ExportController.pdf(request, reply as any);

    expect(prisma.incident.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inc1", companyId: "company1" } }),
    );
    expect(reply.code).toHaveBeenCalledWith(404);
  });

  it("matches the yearly crime PDF chrome: zinc page, green footer strip", async () => {
    (prisma.incident.findFirst as jest.Mock).mockResolvedValue(incident);

    await ExportController.pdf(request, reply as any);

    const content = pdfStreams(reply.send.mock.calls[0][0]).join("\n");
    expect(content).toContain(fillOp("#27272a")); // shared zinc header/page
    expect(content).toContain(fillOp("#4ade80")); // shared green footer strip
    expect(content).not.toContain(fillOp("#0b1e33")); // no navy
  });

  it("centres the incident title to mirror the yearly report", async () => {
    (prisma.incident.findFirst as jest.Mock).mockResolvedValue(incident);

    await ExportController.pdf(request, reply as any);

    const buf = reply.send.mock.calls[0][0];
    const text = pdfText(buf).replace(/\s+/g, "");
    expect(text).toContain("Break-in");
    expect(text).toContain("Ref:INC-1");

    // Font size 18 is unique to the centred title; a left-aligned title would start at x=50.
    const content = pdfStreams(buf).join("\n");
    const titleX = [...content.matchAll(/1 0 0 1 ([\d.]+) [\d.]+ Tm\s*\/F\d+ 18 Tf/g)].map((m) => parseFloat(m[1]));
    expect(titleX.length).toBeGreaterThanOrEqual(1);
    for (const x of titleX) expect(x).toBeGreaterThan(60);
  });

  // Only fails on a non-SAST host without the fix; run with TZ=UTC to prove it locally.
  it("formats dispatch and arrival times in South African time, whatever the server zone", async () => {
    (prisma.incident.findFirst as jest.Mock).mockResolvedValue({
      ...incident,
      dispatchTime: new Date("2026-10-16T21:50:00Z"),
      arrivalTime: new Date("2026-10-16T22:05:00Z"),
    });

    await ExportController.pdf(request, reply as any);

    const text = pdfText(reply.send.mock.calls[0][0]).replace(/\s+/g, "");
    expect(text).toContain("Oct16,2026,11:50PM");
    expect(text).toContain("Oct17,2026,12:05AM");
  });
});