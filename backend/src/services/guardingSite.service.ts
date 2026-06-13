import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";
import { hashPassword } from "../lib/hash";

interface GuardInput {
  name: string;
  surname: string;
  cellphone: string;
  email?: string;
  employeeId: string;
  password: string;
}

interface CreateGuardingSiteParams {
  companyId: string;
  name: string;
  address?: string;
  guards?: GuardInput[];
}

interface UpdateGuardingSiteParams {
  name?: string;
  address?: string;
  status?: string;
}

export const GuardingSiteService = {
  async list(companyId: string) {
    return prisma.guardingSite.findMany({
      where: { companyId },
      include: { _count: { select: { guards: true, patrolReports: true, entryLogs: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

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

  async update(id: string, params: UpdateGuardingSiteParams) {
    const site = await prisma.guardingSite.findUnique({ where: { id } });
    if (!site) throw new NotFoundError("Guarding site");

    return prisma.guardingSite.update({ where: { id }, data: params });
  },

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
