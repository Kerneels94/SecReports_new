/**
 * Business logic for patrol schedules. Handles CRUD with checkpoint management
 * for recurring patrol route templates.
 */
import { prisma } from "../lib/db";
import { NotFoundError } from "../lib/errors";

/** Parameters for creating a patrol schedule. */
interface CreatePatrolScheduleParams {
  siteId: string;
  day: string;
  startTime: string;
  endTime: string;
  checkpoints?: { name: string; order: number }[];
  performedBy?: string;
}

/** Parameters for updating a patrol schedule. */
interface UpdatePatrolScheduleParams {
  siteId?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  checkpoints?: { name: string; order: number }[];
  performedBy?: string;
}

export const PatrolScheduleService = {
  /** Lists patrol schedules for a company with optional site/day filters. */
  async listByCompany(
    companyId: string,
    filters?: { siteId?: string; day?: string },
  ) {
    const where: any = { companyId };
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.day) where.day = filters.day;

    return prisma.patrolSchedule.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
        checkpoints: { orderBy: { order: "asc" } },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });
  },

  /** Gets a patrol schedule with full checkpoint details. */
  async getById(companyId: string, id: string) {
    const schedule = await prisma.patrolSchedule.findFirst({
      where: { id, companyId },
      include: {
        site: { select: { id: true, name: true } },
        checkpoints: { orderBy: { order: "asc" } },
      },
    });
    if (!schedule) throw new NotFoundError("Patrol schedule");
    return schedule;
  },

  /** Creates a patrol schedule with optional checkpoint entries. */
  async create(companyId: string, params: CreatePatrolScheduleParams) {
    const site = await prisma.guardingSite.findFirst({ where: { id: params.siteId, companyId } });
    if (!site) throw new NotFoundError("Guarding site");

    const schedule = await prisma.patrolSchedule.create({
      data: {
        companyId,
        siteId: params.siteId,
        day: params.day,
        startTime: params.startTime,
        endTime: params.endTime,
        checkpoints: params.checkpoints
          ? {
              create: params.checkpoints.map((cp) => ({
                name: cp.name,
                order: cp.order,
              })),
            }
          : undefined,
      },
      include: {
        site: { select: { id: true, name: true } },
        checkpoints: { orderBy: { order: "asc" } },
      },
    });

    if (params.performedBy) {
      await prisma.auditLog.create({
        data: {
          entityType: "patrol_schedule",
          entityId: schedule.id,
          action: "schedule_created",
          newValues: JSON.stringify({ siteId: params.siteId, day: params.day }),
          performedBy: params.performedBy,
        },
      });
    }

    return schedule;
  },

  /** Updates a patrol schedule. If checkpoints are provided, replaces all existing ones. */
  async update(companyId: string, id: string, params: UpdatePatrolScheduleParams) {
    const schedule = await prisma.patrolSchedule.findFirst({ where: { id, companyId } });
    if (!schedule) throw new NotFoundError("Patrol schedule");

    if (params.siteId) {
      const site = await prisma.guardingSite.findFirst({ where: { id: params.siteId, companyId } });
      if (!site) throw new NotFoundError("Guarding site");
    }

    const data: any = {};
    if (params.siteId !== undefined) data.siteId = params.siteId;
    if (params.day !== undefined) data.day = params.day;
    if (params.startTime !== undefined) data.startTime = params.startTime;
    if (params.endTime !== undefined) data.endTime = params.endTime;

    if (params.checkpoints) {
      await prisma.patrolScheduleCheckpoint.deleteMany({ where: { patrolScheduleId: id } });
      if (params.checkpoints.length > 0) {
        await prisma.patrolScheduleCheckpoint.createMany({
          data: params.checkpoints.map((cp) => ({
            patrolScheduleId: id,
            name: cp.name,
            order: cp.order,
          })),
        });
      }
    }

    const updated = await prisma.patrolSchedule.update({
      where: { id },
      data,
      include: {
        site: { select: { id: true, name: true } },
        checkpoints: { orderBy: { order: "asc" } },
      },
    });

    if (params.performedBy) {
      await prisma.auditLog.create({
        data: {
          entityType: "patrol_schedule",
          entityId: id,
          action: "schedule_updated",
          newValues: JSON.stringify({ siteId: data.siteId, day: data.day, startTime: data.startTime, endTime: data.endTime }),
          performedBy: params.performedBy,
        },
      });
    }

    return updated;
  },

  /** Deletes a patrol schedule. Cascade deletes checkpoints. */
  async delete(companyId: string, id: string, performedBy?: string) {
    const schedule = await prisma.patrolSchedule.findFirst({ where: { id, companyId } });
    if (!schedule) throw new NotFoundError("Patrol schedule");

    await prisma.patrolSchedule.delete({ where: { id } });

    if (performedBy) {
      await prisma.auditLog.create({
        data: {
          entityType: "patrol_schedule",
          entityId: id,
          action: "schedule_deleted",
          oldValues: JSON.stringify({ siteId: schedule.siteId, day: schedule.day }),
          performedBy,
        },
      });
    }
  },
};
