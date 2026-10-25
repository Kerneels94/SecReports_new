import { FastifyRequest, FastifyReply } from "fastify";
import { AuditLogService } from "../services/auditLog.service";
import { paginationSchema } from "../validators/incident.schema";
import { ValidationError } from "../lib/errors";
import { ADMIN_FROM_EMAIL, sendMail } from "../services/email.service";
import { prisma } from "../lib/db";

export const AuditLogController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { entityType, action, dateFrom, dateTo, search } =
      request.query as Record<string, string | undefined>;

    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.flatten());
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
    if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.flatten());
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
    const { companyId } = request.params as { companyId: string };
    const { company, entries } = await AuditLogService.exportForCompany(companyId);
    if (!company) throw new ValidationError("Company not found");

    const csvHeader = "Date,User,Email,Action,Entity Type,Entity ID,IP Address\n";
    const csvRows = entries
      .map((e: any) => {
        const date = e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt);
        const user = (e.performedByUser?.name || "").replace(/"/g, '""');
        const email = (e.performedByUser?.email || "").replace(/"/g, '""');
        const action = (e.action || "").replace(/"/g, '""');
        const entityType = (e.entityType || "").replace(/"/g, '""');
        const entityId = e.entityId || "";
        const ip = (e.ipAddress || "").replace(/"/g, '""');
        return `"${date}","${user}","${email}","${action}","${entityType}","${entityId}","${ip}"`;
      })
      .join("\n");
    const csv = csvHeader + csvRows + "\n";

    const superadmins = await prisma.user.findMany({
      where: { role: "superadmin", status: "active" },
      select: { email: true },
    });
    const recipients = Array.from(
      new Set([company.email, ...superadmins.map((u) => u.email)].filter(Boolean)),
    ) as string[];

    const filename = `audit-logs-${company.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now()}.csv`;
    for (const to of recipients) {
      await sendMail({
        to,
        subject: "audit_export",
        data: { companyName: company.name, entryCount: entries.length },
        from: ADMIN_FROM_EMAIL,
        attachments: [{ filename, content: csv }],
      });
    }

    reply.code(200).send({ success: true, data: { emailedTo: recipients, count: entries.length } });
  },
};
