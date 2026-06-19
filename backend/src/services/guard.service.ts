/**
 * Business logic for guard management. Handles CRUD for guard records.
 */
import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";

/** Parameters for creating a guard. */
interface CreateGuardParams {
  companyId: string;
  name: string;
  surname: string;
  cellphone: string;
  employeeId: string;
  siteId?: string;
}

/** Parameters for updating a guard's fields. */
interface UpdateGuardParams {
  name?: string;
  surname?: string;
  cellphone?: string;
  employeeId?: string;
  siteId?: string | null;
  status?: string;
}

export const GuardService = {
  /** Lists guards for a company, optionally filtered by site. */
  async list(companyId: string, siteId?: string) {
    const where: any = { companyId };
    if (siteId) where.siteId = siteId;

    return prisma.guard.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Gets a guard with site and recent patrol reports. */
  async getById(companyId: string, id: string) {
    const guard = await prisma.guard.findFirst({
      where: { id, companyId },
      include: {
        site: { select: { id: true, name: true } },
        patrolReports: { orderBy: { startedAt: "desc" }, take: 10 },
      },
    });
    if (!guard) throw new NotFoundError("Guard");
    return guard;
  },

  /** Creates a guard record, enforcing unique employee ID. */
  async create(params: CreateGuardParams) {
    const existing = await prisma.guard.findFirst({
      where: {
        employeeId: params.employeeId,
        companyId: params.companyId,
      },
    });
    if (existing)
      throw new ConflictError("A guard with this employee ID already exists");

    return prisma.guard.create({
      data: {
        companyId: params.companyId,
        siteId: params.siteId,
        name: params.name,
        surname: params.surname,
        cellphone: params.cellphone,
        employeeId: params.employeeId,
      },
      include: {
        site: { select: { id: true, name: true } },
      },
    });
  },

  /** Updates guard fields. */
  async update(companyId: string, id: string, params: UpdateGuardParams) {
    const guard = await prisma.guard.findFirst({ where: { id, companyId } });
    if (!guard) throw new NotFoundError("Guard");

    if (params.employeeId) {
      const existing = await prisma.guard.findFirst({
        where: {
          employeeId: params.employeeId,
          id: { not: id },
          companyId: guard.companyId,
        },
      });
      if (existing)
        throw new ConflictError("A guard with this employee ID already exists");
    }

    const guardData: any = {};
    if (params.name !== undefined) guardData.name = params.name;
    if (params.surname !== undefined) guardData.surname = params.surname;
    if (params.cellphone !== undefined) guardData.cellphone = params.cellphone;
    if (params.employeeId !== undefined)
      guardData.employeeId = params.employeeId;
    if (params.siteId !== undefined) guardData.siteId = params.siteId;
    if (params.status !== undefined) guardData.status = params.status;

    return prisma.guard.update({
      where: { id },
      data: guardData,
      include: {
        site: { select: { id: true, name: true } },
      },
    });
  },

  /** Deletes a guard record. */
  async delete(companyId: string, id: string) {
    const guard = await prisma.guard.findFirst({ where: { id, companyId } });
    if (!guard) throw new NotFoundError("Guard");

    await prisma.guard.delete({ where: { id } });
  },
};
