/**
 * Business logic for incident reports. Handles CRUD with audit logging, ownership
 * permission checks for reporters, and natural language date parsing for searches.
 */
import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError } from "../lib/errors";
import { generateReferenceNumber } from "../lib/utils";

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/** Parses natural language date strings (e.g. "March 15", "15 March 2024", "January 2023") into a date range filter. */
function tryParseDate(str: string): { gte: Date; lte: Date } | null {
  const s = str.trim().toLowerCase();
  const monthPat = Object.keys(MONTH_NAMES).join("|");

  // "DD Month" or "DD Month YYYY"
  const m1 = s.match(new RegExp(`^(\\d{1,2})\\s+(${monthPat})(?:\\s+(\\d{4}))?$`));
  if (m1) {
    const d = parseInt(m1[1], 10);
    const m = MONTH_NAMES[m1[2]];
    const y = m1[3] ? parseInt(m1[3], 10) : new Date().getFullYear();
    if (d >= 1 && d <= 31) {
      const start = new Date(y, m, d);
      const end = new Date(y, m, d);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
  }

  // "Month DD" or "Month DD YYYY"
  const m2 = s.match(new RegExp(`^(${monthPat})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?$`));
  if (m2) {
    const m = MONTH_NAMES[m2[1]];
    const d = parseInt(m2[2], 10);
    const y = m2[3] ? parseInt(m2[3], 10) : new Date().getFullYear();
    if (d >= 1 && d <= 31) {
      const start = new Date(y, m, d);
      const end = new Date(y, m, d);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
  }

  // "Month" alone → entire month of current year
  const m3 = s.match(new RegExp(`^(${monthPat})$`));
  if (m3) {
    const m = MONTH_NAMES[m3[1]];
    const y = new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  // "Month YYYY" → entire month of that year
  const m4 = s.match(new RegExp(`^(${monthPat})\\s+(\\d{4})$`));
  if (m4) {
    const m = MONTH_NAMES[m4[1]];
    const y = parseInt(m4[2], 10);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  // ISO-style date strings
  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    const d = new Date(ts);
    if (d.getFullYear() >= 2020 && d.getFullYear() <= 2100) {
      const start = new Date(d);
      const end = new Date(d);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
  }

  return null;
}

/** Parameters for creating an incident report. */
interface CreateIncidentParams {
  companyId: string;
  title: string;
  description: string;
  type: string;
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

/** Parameters for updating an incident report. */
interface UpdateIncidentParams {
  title?: string;
  description?: string;
  type?: string;
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

/** Pagination and filtering options for listing incidents. */
interface ListParams {
  page: number;
  perPage: number;
  companyId: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  userId?: string;
  role?: string;
}

export const IncidentService = {
  /** Paginated listing with filtering by status, type, full-text search, and date range. Search also attempts natural language date parsing. */
  async list(params: ListParams) {
    const where: any = { companyId: params.companyId };

    if (params.status) where.status = params.status;
    if (params.type) where.type = { contains: params.type, mode: "insensitive" };
    if (params.search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: params.search } },
        { referenceNumber: { contains: params.search } },
      ];

      const parsed = tryParseDate(params.search);
      if (parsed) {
        where.OR.push({ incidentDate: { gte: parsed.gte, lte: parsed.lte } });
      }
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

  /** Gets a full incident with all relations (reporter, investigator, comments, investigation, corrective actions). */
  async getById(id: string) {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignedInvestigator: { select: { id: true, name: true, email: true } },
        people: true,
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

  /** Creates an incident with auto-generated reference number and an audit log entry. */
  async create(params: CreateIncidentParams) {
    const referenceNumber = generateReferenceNumber();

    const incident = await prisma.incident.create({
      data: {
        referenceNumber,
        companyId: params.companyId,
        title: params.title,
        description: params.description,
        type: params.type,
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
        newValues: JSON.stringify({ title: params.title }),
        performedBy: params.reporterId,
      },
    });

    return incident;
  },

  /** Updates an incident with reporter ownership check and audit log of old/new values. */
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
          status: incident.status,
        }),
        newValues: JSON.stringify({ title: params.title }),
        performedBy: userId,
      },
    });

    return updated;
  },

  /** Changes incident status and logs the transition in the audit log. */
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

  /** Deletes an incident with reporter ownership check and audit log. */
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
