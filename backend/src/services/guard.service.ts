import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";
import { hashPassword } from "../lib/hash";

interface CreateGuardParams {
  companyId: string;
  name: string;
  surname: string;
  cellphone: string;
  email: string;
  employeeId: string;
  siteId?: string;
  password: string;
}

interface UpdateGuardParams {
  name?: string;
  surname?: string;
  cellphone?: string;
  email?: string;
  employeeId?: string;
  siteId?: string | null;
  status?: string;
}

export const GuardService = {
  async list(companyId: string, siteId?: string) {
    const where: any = { companyId };
    if (siteId) where.siteId = siteId;

    return prisma.guard.findMany({
      where,
      include: { site: { select: { id: true, name: true } }, user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    const guard = await prisma.guard.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true, status: true } },
        patrolReports: { orderBy: { startedAt: "desc" }, take: 10 },
      },
    });
    if (!guard) throw new NotFoundError("Guard");
    return guard;
  },

  async create(params: CreateGuardParams) {
    const existing = await prisma.guard.findFirst({
      where: { OR: [{ email: params.email }, { employeeId: params.employeeId }], companyId: params.companyId },
    });
    if (existing) throw new ConflictError("A guard with this email or employee ID already exists");

    const passwordHash = await hashPassword(params.password);

    const guard = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId: params.companyId,
          name: `${params.name} ${params.surname}`,
          email: params.email,
          passwordHash,
          role: "guard",
        },
      });

      return tx.guard.create({
        data: {
          companyId: params.companyId,
          siteId: params.siteId,
          userId: user.id,
          name: params.name,
          surname: params.surname,
          cellphone: params.cellphone,
          email: params.email,
          employeeId: params.employeeId,
        },
        include: {
          site: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, role: true } },
        },
      });
    });

    return guard;
  },

  async update(id: string, params: UpdateGuardParams) {
    const guard = await prisma.guard.findUnique({ where: { id } });
    if (!guard) throw new NotFoundError("Guard");

    if (params.email || params.employeeId) {
      const existing = await prisma.guard.findFirst({
        where: {
          OR: [
            ...(params.email ? [{ email: params.email }] : []),
            ...(params.employeeId ? [{ employeeId: params.employeeId }] : []),
          ],
          id: { not: id },
          companyId: guard.companyId,
        },
      });
      if (existing) throw new ConflictError("A guard with this email or employee ID already exists");
    }

    const guardData: any = {};
    if (params.name !== undefined) guardData.name = params.name;
    if (params.surname !== undefined) guardData.surname = params.surname;
    if (params.cellphone !== undefined) guardData.cellphone = params.cellphone;
    if (params.email !== undefined) guardData.email = params.email;
    if (params.employeeId !== undefined) guardData.employeeId = params.employeeId;
    if (params.siteId !== undefined) guardData.siteId = params.siteId;
    if (params.status !== undefined) guardData.status = params.status;

    if (params.email || params.name || params.surname) {
      await prisma.user.update({
        where: { id: guard.userId },
        data: {
          ...(params.email ? { email: params.email } : {}),
          ...(params.name || params.surname ? { name: `${params.name || guard.name} ${params.surname || guard.surname}` } : {}),
        },
      });
    }

    return prisma.guard.update({
      where: { id },
      data: guardData,
      include: {
        site: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true } },
      },
    });
  },

  async delete(id: string) {
    const guard = await prisma.guard.findUnique({ where: { id } });
    if (!guard) throw new NotFoundError("Guard");

    await prisma.$transaction(async (tx) => {
      await tx.guard.delete({ where: { id } });
      await tx.user.delete({ where: { id: guard.userId } });
    });
  },
};
