import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError } from "../lib/errors";
import { generateReferenceNumber } from "../lib/utils";

interface CreateIncidentParams {
  companyId: number;
  title: string;
  description: string;
  type: string;
  severity: string;
  category: string;
  incidentDate: string;
  location?: string;
  reporterId: number;
  people?: { name: string; role: string; contact?: string; notes?: string }[];
}

interface UpdateIncidentParams {
  title?: string;
  description?: string;
  type?: string;
  severity?: string;
  category?: string;
  incidentDate?: string;
  location?: string;
}

interface ListParams {
  page: number;
  perPage: number;
  companyId: number;
  status?: string;
  severity?: string;
  search?: string;
  userId?: number;
  role?: string;
}

export const IncidentService = {
  async list(params: ListParams) {
    const where: any = { companyId: params.companyId };

    if (params.status) where.status = params.status;
    if (params.severity) where.severity = params.severity;
    if (params.search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: params.search } },
        { referenceNumber: { contains: params.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: { reporter: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      prisma.incident.count({ where }),
    ]);

    return { data, total, page: params.page, perPage: params.perPage };
  },

  async getById(id: number) {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignedInvestigator: { select: { id: true, name: true, email: true } },
        people: true,
        evidence: true,
        comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        investigation: true,
        correctiveActions: {
          include: { owner: { select: { id: true, name: true } } },
        },
      },
    });

    if (!incident) throw new NotFoundError("Incident");
    return incident;
  },

  async create(params: CreateIncidentParams) {
    const referenceNumber = generateReferenceNumber();

    const incident = await prisma.incident.create({
      data: {
        referenceNumber,
        companyId: params.companyId,
        title: params.title,
        description: params.description,
        type: params.type,
        severity: params.severity as any,
        category: params.category,
        incidentDate: new Date(params.incidentDate),
        location: params.location,
        reporterId: params.reporterId,
        people: params.people
          ? { create: params.people }
          : undefined,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        people: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "incident",
        entityId: incident.id,
        action: "create",
        newValues: JSON.stringify({ title: params.title, severity: params.severity }),
        performedBy: params.reporterId,
      },
    });

    return incident;
  },

  async update(id: number, params: UpdateIncidentParams, userId: number, userRole: string) {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError("Incident");

    if (userRole === "reporter" && incident.reporterId !== userId) {
      throw new ForbiddenError("You can only edit your own incidents");
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        ...(params.title && { title: params.title }),
        ...(params.description && { description: params.description }),
        ...(params.type && { type: params.type }),
        ...(params.severity && { severity: params.severity as any }),
        ...(params.category && { category: params.category }),
        ...(params.incidentDate && { incidentDate: new Date(params.incidentDate) }),
        ...(params.location !== undefined && { location: params.location }),
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignedInvestigator: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "incident",
        entityId: id,
        action: "update",
        oldValues: JSON.stringify({
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
        }),
        newValues: JSON.stringify({ title: params.title, severity: params.severity }),
        performedBy: userId,
      },
    });

    return updated;
  },

  async updateStatus(id: number, status: string, userId: number) {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError("Incident");

    const oldStatus = incident.status;

    const updated = await prisma.incident.update({
      where: { id },
      data: { status: status as any },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "incident",
        entityId: id,
        action: "status_change",
        oldValues: JSON.stringify({ status: oldStatus }),
        newValues: JSON.stringify({ status }),
        performedBy: userId,
      },
    });

    return updated;
  },

  async delete(id: number, userId: number, userRole: string) {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError("Incident");

    if (userRole === "reporter" && incident.reporterId !== userId) {
      throw new ForbiddenError("You can only delete your own incidents");
    }

    await prisma.incident.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entityType: "incident",
        entityId: id,
        action: "delete",
        oldValues: JSON.stringify({ title: incident.title }),
        performedBy: userId,
      },
    });
  },
};
