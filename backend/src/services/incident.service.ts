import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError } from "../lib/errors";
import { generateReferenceNumber } from "../lib/utils";

interface CreateIncidentParams {
  companyId: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  incidentDate: string;
  location?: string;
  operatorName: string;
  dispatcher: string;
  dispatchTime?: string;
  arrivalTime?: string;
  callSign?: string;
  propertyAddress?: string;
  clientName?: string;
  clientCode?: string;
  businessOrComplex?: string;
  sapsReference?: string;
  reporterId: string;
  people?: { name: string; role: string; contact?: string; notes?: string }[];
}

interface UpdateIncidentParams {
  title?: string;
  description?: string;
  type?: string;
  severity?: string;
  incidentDate?: string;
  location?: string;
  operatorName?: string;
  dispatcher?: string;
  dispatchTime?: string;
  arrivalTime?: string;
  callSign?: string;
  propertyAddress?: string;
  clientName?: string;
  clientCode?: string;
  businessOrComplex?: string;
  sapsReference?: string;
}

interface ListParams {
  page: number;
  perPage: number;
  companyId: string;
  status?: string;
  severity?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
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

    if (params.dateFrom || params.dateTo) {
      where.incidentDate = {};
      if (params.dateFrom) where.incidentDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.incidentDate.lte = new Date(params.dateTo);
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

  async getById(id: string) {
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
        incidentDate: new Date(params.incidentDate),
        location: params.location,
        operatorName: params.operatorName,
        dispatcher: params.dispatcher,
        dispatchTime: params.dispatchTime ? new Date(params.dispatchTime) : undefined,
        arrivalTime: params.arrivalTime ? new Date(params.arrivalTime) : undefined,
        callSign: params.callSign,
        propertyAddress: params.propertyAddress,
        clientName: params.clientName,
        clientCode: params.clientCode,
        businessOrComplex: params.businessOrComplex,
        sapsReference: params.sapsReference,
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

  async update(id: string, params: UpdateIncidentParams, userId: string, userRole: string) {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError("Incident");

    if (userRole === "reporter" && incident.reporterId !== userId) {
      throw new ForbiddenError("You can only edit your own incidents");
    }

    const data: any = {};
    if (params.title !== undefined) data.title = params.title;
    if (params.description !== undefined) data.description = params.description;
    if (params.type !== undefined) data.type = params.type;
    if (params.severity !== undefined) data.severity = params.severity;
    if (params.incidentDate !== undefined) data.incidentDate = new Date(params.incidentDate);
    if (params.location !== undefined) data.location = params.location;
    if (params.operatorName !== undefined) data.operatorName = params.operatorName;
    if (params.dispatcher !== undefined) data.dispatcher = params.dispatcher;
    if (params.dispatchTime !== undefined) data.dispatchTime = params.dispatchTime ? new Date(params.dispatchTime) : null;
    if (params.arrivalTime !== undefined) data.arrivalTime = params.arrivalTime ? new Date(params.arrivalTime) : null;
    if (params.callSign !== undefined) data.callSign = params.callSign;
    if (params.propertyAddress !== undefined) data.propertyAddress = params.propertyAddress;
    if (params.clientName !== undefined) data.clientName = params.clientName;
    if (params.clientCode !== undefined) data.clientCode = params.clientCode;
    if (params.businessOrComplex !== undefined) data.businessOrComplex = params.businessOrComplex;
    if (params.sapsReference !== undefined) data.sapsReference = params.sapsReference;

    const updated = await prisma.incident.update({
      where: { id },
      data,
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

  async updateStatus(id: string, status: string, userId: string) {
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

  async delete(id: string, userId: string, userRole: string) {
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
