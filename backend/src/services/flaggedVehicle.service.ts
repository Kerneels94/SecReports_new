/**
 * Business logic for flagged vehicles. Handles flagging, resolution, and deletion
 * with automatic entry log association.
 */
import { prisma } from "../lib/db";
import { NotFoundError, ValidationError } from "../lib/errors";

export const FlaggedVehicleService = {
  /** Lists flagged vehicles for a company. Optionally includes resolved flags. */
  async listByCompany(companyId: string, includeResolved = false) {
    const where: any = { companyId };
    if (!includeResolved) where.resolvedAt = null;

    return prisma.flaggedVehicle.findMany({
      where,
      include: {
        flaggedBy: { select: { id: true, name: true, surname: true } },
        _count: { select: { entryLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Gets a flagged vehicle with company, flagger, and entry log history. */
  async getById(id: string) {
    const vehicle = await prisma.flaggedVehicle.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        flaggedBy: { select: { id: true, name: true, surname: true } },
        entryLogs: {
          include: { site: { select: { id: true, name: true } } },
          orderBy: { entryTime: "desc" },
        },
      },
    });
    if (!vehicle) throw new NotFoundError("Flagged vehicle");
    return vehicle;
  },

  /** Flags a vehicle (prevents duplicate active flags) and optionally links to an entry log. */
  async create(params: { companyId: string; vehicleReg: string; reason: string; flaggedById: string; entryLogId?: string }) {
    const existing = await prisma.flaggedVehicle.findFirst({
      where: { vehicleReg: params.vehicleReg, companyId: params.companyId, resolvedAt: null },
    });
    if (existing) throw new ValidationError("Vehicle is already flagged");

    const vehicle = await prisma.flaggedVehicle.create({
      data: {
        companyId: params.companyId,
        vehicleReg: params.vehicleReg,
        reason: params.reason,
        flaggedById: params.flaggedById,
      },
    });

    if (params.entryLogId) {
      await prisma.entryLog.update({
        where: { id: params.entryLogId },
        data: { flaggedVehicleId: vehicle.id },
      });
    }

    return vehicle;
  },

  /** Marks a flagged vehicle as resolved with a timestamp. */
  async resolve(id: string) {
    const vehicle = await prisma.flaggedVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundError("Flagged vehicle");
    if (vehicle.resolvedAt) throw new ValidationError("Vehicle is already resolved");

    return prisma.flaggedVehicle.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  },

  /** Removes a flagged vehicle and unlinks it from all associated entry logs. */
  async delete(id: string) {
    const vehicle = await prisma.flaggedVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundError("Flagged vehicle");

    await prisma.entryLog.updateMany({
      where: { flaggedVehicleId: id },
      data: { flaggedVehicleId: null },
    });

    await prisma.flaggedVehicle.delete({ where: { id } });
  },
};
