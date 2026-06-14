/**
 * Business logic for guarding sites. Handles CRUD with optional bulk guard creation
 * during site setup and cascading cleanup on deletion.
 */
import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";
import { hashPassword } from "../lib/hash";

/** Input for creating a guard inline during site creation. */
interface GuardInput {
  name: string;
  surname: string;
  cellphone: string;
  email?: string;
  employeeId: string;
  password: string;
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
  async getById(id: string) {
    const site = await prisma.guardingSite.findUnique({
      where: { id },
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

  /** Creates a site and optionally bulk-creates guards with linked user accounts in a transaction. */
  async create(params: CreateGuardingSiteParams) {
    return prisma.$transaction(async (tx) => {
      const site = await tx.guardingSite.create({
        data: { companyId: params.companyId, name: params.name, address: params.address },
      });

      if (params.guards && params.guards.length > 0) {
        for (const g of params.guards) {
          const guardEmail = g.email || `${g.employeeId}@guarding.local`;

          const existing = await tx.guard.findFirst({
            where: { OR: [{ email: guardEmail }, { employeeId: g.employeeId }], companyId: params.companyId },
          });
          if (existing) {
            throw new ConflictError(
              existing.email === guardEmail
                ? `A guard with email ${guardEmail} already exists`
                : `A guard with employee ID ${g.employeeId} already exists`,
            );
          }

          const passwordHash = await hashPassword(g.password);
          const user = await tx.user.create({
            data: {
              companyId: params.companyId,
              name: `${g.name} ${g.surname}`,
              email: guardEmail,
              passwordHash,
              role: "guard",
            },
          });
          await tx.guard.create({
            data: {
              companyId: params.companyId,
              siteId: site.id,
              userId: user.id,
              name: g.name,
              surname: g.surname,
              cellphone: g.cellphone,
              email: guardEmail,
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
  async update(id: string, params: UpdateGuardingSiteParams) {
    const site = await prisma.guardingSite.findUnique({ where: { id } });
    if (!site) throw new NotFoundError("Guarding site");

    return prisma.guardingSite.update({ where: { id }, data: params });
  },

  /** Deletes a site and cascades to remove related patrol data, entry logs, and unassign guards. */
  async delete(id: string) {
    const site = await prisma.guardingSite.findUnique({ where: { id } });
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
