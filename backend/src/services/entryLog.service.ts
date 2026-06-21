/**
 * Business logic for vehicle/person entry logs at guarding sites.
 * Handles CRUD with automatic flagged vehicle detection on entry.
 */
import { prisma } from "../lib/db";
import { NotFoundError } from "../lib/errors";

interface CreateEntryLogParams {
  siteId: string;
  guardId?: string;
  driverName: string;
  driverContact?: string;
  vehicleReg: string;
  vehicleDesc?: string;
  entryTime: string;
  purpose?: string;
}

interface UpdateEntryLogParams {
  exitTime?: string;
  driverName?: string;
  driverContact?: string;
  vehicleDesc?: string;
  purpose?: string;
}

export const EntryLogService = {
  /** Lists entry logs for a site with guard and flagged vehicle info. */
  async listBySite(companyId: string, siteId: string) {
    return prisma.entryLog.findMany({
      where: { siteId, site: { companyId } },
      include: {
        guard: { select: { id: true, name: true, surname: true } },
        flaggedVehicle: { select: { id: true, vehicleReg: true, reason: true, resolvedAt: true } },
      },
      orderBy: { entryTime: "desc" },
    });
  },

  /** Lists entry logs across all company sites, limited to the 50 most recent. */
  async listByCompany(companyId: string) {
    return prisma.entryLog.findMany({
      where: { site: { companyId } },
      include: {
        site: { select: { id: true, name: true } },
        guard: { select: { id: true, name: true, surname: true } },
        flaggedVehicle: { select: { id: true, vehicleReg: true, reason: true, resolvedAt: true } },
      },
      orderBy: { entryTime: "desc" },
      take: 50,
    });
  },

  /** Gets a single entry log with full site, guard, and flagged vehicle details. */
  async getById(companyId: string, id: string) {
    const log = await prisma.entryLog.findFirst({
      where: { id, site: { companyId } },
      include: {
        site: { select: { id: true, name: true, address: true } },
        guard: { select: { id: true, name: true, surname: true } },
        flaggedVehicle: { select: { id: true, vehicleReg: true, reason: true, createdAt: true, resolvedAt: true } },
      },
    });
    if (!log) throw new NotFoundError("Entry log");
    return log;
  },

  /** Creates an entry log and auto-links any unresolved flagged vehicle by registration. */
  async create(params: CreateEntryLogParams) {
    let flaggedVehicleId: string | undefined;

    const flagged = await prisma.flaggedVehicle.findFirst({
      where: {
        vehicleReg: params.vehicleReg,
        companyId: (await prisma.guardingSite.findUnique({ where: { id: params.siteId } }))!.companyId,
        resolvedAt: null,
      },
    });

    if (flagged) {
      flaggedVehicleId = flagged.id;
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
        flaggedVehicleId,
      },
      include: {
        site: { select: { id: true, name: true } },
        guard: { select: { id: true, name: true, surname: true } },
        flaggedVehicle: { select: { id: true, vehicleReg: true, reason: true, resolvedAt: true } },
      },
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
      include: {
        site: { select: { id: true, name: true } },
        guard: { select: { id: true, name: true, surname: true } },
        flaggedVehicle: { select: { id: true, vehicleReg: true, reason: true, resolvedAt: true } },
      },
    });
  },

  /** Deletes an entry log. */
  async delete(companyId: string, id: string) {
    const log = await prisma.entryLog.findFirst({ where: { id, site: { companyId } } });
    if (!log) throw new NotFoundError("Entry log");

    await prisma.entryLog.delete({ where: { id } });
  },
};
