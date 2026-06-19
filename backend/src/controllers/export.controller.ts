/**
 * Export controller — handles data export (CSV and PDF) for incidents.
 * Requires the "export_csv_pdf" subscription feature.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/db";
import { SubscriptionService } from "../services/subscription.service";

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
      "Reference", "Title", "Type", "Status",
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
      sanitizeCsv(i.status),
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

  /** Placeholder for PDF export — returns 501 Not Implemented. */
  async pdf(_request: FastifyRequest, _reply: FastifyReply) {
    _reply.code(501).send({ success: false, error: { code: "NOT_IMPLEMENTED", message: "PDF export coming soon" } });
  },
};
