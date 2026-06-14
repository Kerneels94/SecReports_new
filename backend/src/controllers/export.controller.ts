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

    const rows = incidents.map((i) => [
      i.referenceNumber,
      `"${i.title.replace(/"/g, '""')}"`,
      i.type,
      i.status,
      i.incidentDate.toISOString().split("T")[0],
      i.location || "",
      i.operatorName,
      i.dispatcher,
      i.reporter?.name || "",
      i.createdAt.toISOString().split("T")[0],
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
