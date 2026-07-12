/**
 * Business logic for vehicle/person entry logs at guarding sites.
 * Handles CRUD with inline flag/unflag support.
 */
import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";

interface CreateEntryLogParams {
  siteId: string;
  guardId?: string;
  driverName: string;
  driverContact?: string;
  vehicleReg: string;
  vehicleDesc?: string;
  entryTime: string;
  purpose?: string;
  flagged?: boolean;
  flagReason?: string;
  flaggedById?: string;
}

interface UpdateEntryLogParams {
  exitTime?: string;
  driverName?: string;
  driverContact?: string;
  vehicleDesc?: string;
  purpose?: string;
}

const ENTRY_INCLUDE = {
  site: { select: { id: true, name: true } },
  guard: { select: { id: true, name: true, surname: true } },
};

export const EntryLogService = {
  /** Lists entry logs for a site with guard info. */
  async listBySite(companyId: string, siteId: string) {
    return prisma.entryLog.findMany({
      where: { siteId, site: { companyId } },
      include: ENTRY_INCLUDE,
      orderBy: { entryTime: "desc" },
    });
  },

  /** Lists entry logs across all company sites, limited to the 50 most recent. */
  async listByCompany(companyId: string) {
    return prisma.entryLog.findMany({
      where: { site: { companyId } },
      include: ENTRY_INCLUDE,
      orderBy: { entryTime: "desc" },
      take: 50,
    });
  },

  /** Gets a single entry log with full site and guard details. */
  async getById(companyId: string, id: string) {
    const log = await prisma.entryLog.findFirst({
      where: { id, site: { companyId } },
      include: {
        site: { select: { id: true, name: true, address: true } },
        guard: { select: { id: true, name: true, surname: true } },
      },
    });
    if (!log) throw new NotFoundError("Entry log");
    return log;
  },

  /** Creates an entry log, optionally flagged at creation time. */
  async create(companyId: string, params: CreateEntryLogParams) {
    const site = await prisma.guardingSite.findFirst({ where: { id: params.siteId, companyId } });
    if (!site) throw new NotFoundError("Site");

    if (params.flagged && params.flagReason) {
      const existing = await prisma.entryLog.findFirst({
        where: {
          vehicleReg: params.vehicleReg,
          site: { companyId },
          flagged: true,
          resolvedAt: null,
        },
      });
      if (existing) throw new ConflictError("Vehicle is already flagged");

      return prisma.entryLog.create({
        data: {
          siteId: params.siteId,
          guardId: params.guardId,
          driverName: params.driverName,
          driverContact: params.driverContact,
          vehicleReg: params.vehicleReg,
          vehicleDesc: params.vehicleDesc,
          entryTime: new Date(params.entryTime),
          purpose: params.purpose,
          flagged: true,
          flagReason: params.flagReason,
          flaggedById: params.flaggedById,
          flaggedAt: new Date(),
        },
        include: ENTRY_INCLUDE,
      });
    }

    return prisma.entryLog.create({
      data: {
        siteId: params.siteId,
        guardId: params.guardId,
        driverName: params.driverName,
        driverContact: params.driverContact,
        vehicleReg: params.vehicleReg,
        vehicleDesc: params.vehicleDesc,
        entryTime: new Date(params.entryTime),
        purpose: params.purpose,
      },
      include: ENTRY_INCLUDE,
    });
  },

  /** Partially updates an entry log's exit time, driver info, or purpose. */
  async update(companyId: string, id: string, params: UpdateEntryLogParams) {
    const log = await prisma.entryLog.findFirst({ where: { id, site: { companyId } } });
    if (!log) throw new NotFoundError("Entry log");

    const data: any = {};
    if (params.exitTime !== undefined) data.exitTime = new Date(params.exitTime);
    if (params.driverName !== undefined) data.driverName = params.driverName;
    if (params.driverContact !== undefined) data.driverContact = params.driverContact;
    if (params.vehicleDesc !== undefined) data.vehicleDesc = params.vehicleDesc;
    if (params.purpose !== undefined) data.purpose = params.purpose;

    return prisma.entryLog.update({
      where: { id },
      data,
      include: ENTRY_INCLUDE,
    });
  },

  /** Flags an entry log. Rejects if the vehicle is already flagged (same reg, same company, unresolved). */
  async flag(companyId: string, id: string, userId: string, reason: string) {
    const log = await prisma.entryLog.findFirst({ where: { id, site: { companyId } } });
    if (!log) throw new NotFoundError("Entry log");
    if (log.flagged && !log.resolvedAt) throw new ConflictError("Vehicle is already flagged");

    const existing = await prisma.entryLog.findFirst({
      where: {
        vehicleReg: log.vehicleReg,
        site: { companyId },
        flagged: true,
        resolvedAt: null,
      },
    });
    if (existing) throw new ConflictError("Vehicle is already flagged");

    return prisma.entryLog.update({
      where: { id },
      data: {
        flagged: true,
        flagReason: reason,
        flaggedById: userId,
        flaggedAt: new Date(),
        resolvedAt: null,
      },
      include: ENTRY_INCLUDE,
    });
  },

  /** Unflags (resolves) an entry log by setting resolvedAt and resolveReason. */
  async resolve(companyId: string, id: string, reason: string) {
    const log = await prisma.entryLog.findFirst({ where: { id, site: { companyId } } });
    if (!log) throw new NotFoundError("Entry log");
    if (!log.flagged) throw new ConflictError("Entry is not flagged");
    if (log.resolvedAt) throw new ConflictError("Entry is already resolved");

    return prisma.entryLog.update({
      where: { id },
      data: { resolvedAt: new Date(), resolveReason: reason },
      include: ENTRY_INCLUDE,
    });
  },

  /** Deletes an entry log. */
  async delete(companyId: string, id: string) {
    const log = await prisma.entryLog.findFirst({ where: { id, site: { companyId } } });
    if (!log) throw new NotFoundError("Entry log");

    await prisma.entryLog.delete({ where: { id } });
  },
};
