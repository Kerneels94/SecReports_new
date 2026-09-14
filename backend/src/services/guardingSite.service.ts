/**
 * Business logic for guarding sites. Handles CRUD with optional bulk guard creation
 * during site setup and cascading cleanup on deletion.
 */
import { prisma } from "../lib/db";
import { AuditLogService } from "./auditLog.service";
import { NotFoundError, ConflictError } from "../lib/errors";

/** Input for creating a guard inline during site creation. */
interface GuardInput {
  name: string;
  surname: string;
  cellphone: string;
  employeeId: string;
}

/** Parameters for creating a guarding site with optional bulk-guard creation. */
interface CreateGuardingSiteParams {
  companyId: string;
  name: string;
  address?: string;
  guards?: GuardInput[];
  performedBy?: string;
}

/** Parameters for updating a guarding site. */
interface UpdateGuardingSiteParams {
  name?: string;
  address?: string;
  status?: string;
  newGuards?: GuardInput[];
  removeGuardIds?: string[];
}

export const GuardingSiteService = {
  /** Lists all sites for a company with counts of guards, patrols, and entry logs. */
  async list(companyId: string) {
    return prisma.guardingSite.findMany({
      where: { companyId },
      include: { _count: { select: { guards: true, patrolReports: true, entryLogs: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Gets a site with active guards, recent patrol reports, and entry logs. */
  async getById(companyId: string, id: string) {
    const site = await prisma.guardingSite.findFirst({
      where: { id, companyId },
      include: {
        guards: { where: { status: "active" } },
        patrolReports: { orderBy: { startedAt: "desc" }, take: 10 },
        entryLogs: { orderBy: { entryTime: "desc" }, take: 20 },
        _count: { select: { guards: true, patrolReports: true, entryLogs: true } },
      },
    });
    if (!site) throw new NotFoundError("Guarding site");
    return site;
  },

  /** Creates a site and optionally bulk-creates guards. */
  async create(params: CreateGuardingSiteParams) {
    const site = await prisma.guardingSite.create({
      data: { companyId: params.companyId, name: params.name, address: params.address },
    });

    if (params.performedBy) {
      await AuditLogService.create({
        entityType: "guarding_site",
        entityId: site.id,
        action: "site_created",
        newValues: JSON.stringify({ name: params.name }),
        performedBy: params.performedBy,
      });
    }

    if (params.guards && params.guards.length > 0) {
      for (const g of params.guards) {
        const existing = await prisma.guard.findFirst({
          where: { employeeId: g.employeeId },
        });
        if (existing) {
          throw new ConflictError(
            `A guard with employee ID ${g.employeeId} already exists`,
          );
        }

        await prisma.guard.create({
          data: {
            companyId: params.companyId,
            siteId: site.id,
            name: g.name,
            surname: g.surname,
            cellphone: g.cellphone,
            employeeId: g.employeeId,
          },
        });
      }
    }

    return prisma.guardingSite.findUnique({
      where: { id: site.id },
      include: { _count: { select: { guards: true, patrolReports: true, entryLogs: true } } },
    });
  },

  /** Updates a site's name, address, or status, and optionally adds/removes guards. */
  async update(companyId: string, id: string, params: UpdateGuardingSiteParams) {
    const site = await prisma.guardingSite.findFirst({ where: { id, companyId } });
    if (!site) throw new NotFoundError("Guarding site");

    if (params.removeGuardIds && params.removeGuardIds.length > 0) {
      await prisma.guard.updateMany({
        where: { id: { in: params.removeGuardIds }, siteId: id, companyId },
        data: { siteId: null },
      });
    }

    if (params.newGuards && params.newGuards.length > 0) {
      for (const g of params.newGuards) {
        const existing = await prisma.guard.findFirst({
          where: { employeeId: g.employeeId },
        });
        if (existing) {
          throw new ConflictError(
            `A guard with employee ID ${g.employeeId} already exists`,
          );
        }

        await prisma.guard.create({
          data: {
            companyId,
            siteId: id,
            name: g.name,
            surname: g.surname,
            cellphone: g.cellphone,
            employeeId: g.employeeId,
          },
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.address !== undefined) updateData.address = params.address;
    if (params.status !== undefined) updateData.status = params.status;

    return prisma.guardingSite.update({
      where: { id },
      data: updateData,
      include: {
        guards: true,
        _count: { select: { guards: true, patrolReports: true, entryLogs: true } },
      },
    });
  },

  /** Deletes a site and cascades to remove related patrol data, entry logs, and unassign guards. */
  async delete(companyId: string, id: string) {
    const site = await prisma.guardingSite.findFirst({ where: { id, companyId } });
    if (!site) throw new NotFoundError("Guarding site");

    await prisma.guard.updateMany({ where: { siteId: id }, data: { siteId: null } });
    await prisma.patrolCheckpoint.deleteMany({ where: { patrolReport: { siteId: id } } });
    await prisma.patrolReport.deleteMany({ where: { siteId: id } });
    await prisma.entryLog.deleteMany({ where: { siteId: id } });
    await prisma.guardingSite.delete({ where: { id } });
  },
};
