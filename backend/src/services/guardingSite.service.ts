/**
 * Business logic for guarding sites. Handles CRUD with optional bulk guard creation
 * during site setup and cascading cleanup on deletion.
 */
import { prisma } from "../lib/db";
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
}

/** Parameters for updating a guarding site. */
interface UpdateGuardingSiteParams {
  name?: string;
  address?: string;
  status?: string;
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

  /** Creates a site and optionally bulk-creates guards in a transaction. */
  async create(params: CreateGuardingSiteParams) {
    return prisma.$transaction(async (tx) => {
      const site = await tx.guardingSite.create({
        data: { companyId: params.companyId, name: params.name, address: params.address },
      });

      if (params.guards && params.guards.length > 0) {
        for (const g of params.guards) {
          const existing = await tx.guard.findFirst({
            where: { employeeId: g.employeeId, companyId: params.companyId },
          });
          if (existing) {
            throw new ConflictError(
              `A guard with employee ID ${g.employeeId} already exists`,
            );
          }

          await tx.guard.create({
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

      return tx.guardingSite.findUnique({
        where: { id: site.id },
        include: { _count: { select: { guards: true, patrolReports: true, entryLogs: true } } },
      });
    });
  },

  /** Updates a site's name, address, or status. */
  async update(companyId: string, id: string, params: UpdateGuardingSiteParams) {
    const site = await prisma.guardingSite.findFirst({ where: { id, companyId } });
    if (!site) throw new NotFoundError("Guarding site");

    return prisma.guardingSite.update({ where: { id }, data: params });
  },

  /** Deletes a site and cascades to remove related patrol data, entry logs, and unassign guards. */
  async delete(companyId: string, id: string) {
    const site = await prisma.guardingSite.findFirst({ where: { id, companyId } });
    if (!site) throw new NotFoundError("Guarding site");

    await prisma.$transaction(async (tx) => {
      await tx.guard.updateMany({ where: { siteId: id }, data: { siteId: null } });
      await tx.patrolCheckpoint.deleteMany({ where: { patrolReport: { siteId: id } } });
      await tx.patrolReport.deleteMany({ where: { siteId: id } });
      await tx.entryLog.deleteMany({ where: { siteId: id } });
      await tx.guardingSite.delete({ where: { id } });
    });
  },
};
