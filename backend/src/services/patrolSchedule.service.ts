/**
 * Business logic for patrol schedules. Handles CRUD with time-slot and
 * checkpoint management for recurring patrol route templates.
 */
import { prisma } from "../lib/db";
import { NotFoundError } from "../lib/errors";

/** Parameters for creating a patrol schedule. */
interface CreatePatrolScheduleParams {
  siteId: string;
  day: string;
  timeSlots: {
    startTime: string;
    endTime: string;
    order?: number;
    checkpoints?: { name: string; order: number }[];
  }[];
  performedBy?: string;
}

/** Parameters for updating a patrol schedule. */
interface UpdatePatrolScheduleParams {
  siteId?: string;
  day?: string;
  timeSlots?: {
    startTime: string;
    endTime: string;
    order?: number;
    checkpoints?: { name: string; order: number }[];
  }[];
  performedBy?: string;
}

const includeTimeSlots = {
  site: { select: { id: true, name: true } },
  timeSlots: {
    orderBy: { order: "asc" as const },
    include: { checkpoints: { orderBy: { order: "asc" as const } } },
  },
};

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
      include: includeTimeSlots,
      orderBy: [{ day: "asc" }],
    });
  },

  /** Gets a patrol schedule with full time-slot and checkpoint details. */
  async getById(companyId: string, id: string) {
    const schedule = await prisma.patrolSchedule.findFirst({
      where: { id, companyId },
      include: includeTimeSlots,
    });
    if (!schedule) throw new NotFoundError("Patrol schedule");
    return schedule;
  },

  /** Creates a patrol schedule with nested time slots and checkpoints. */
  async create(companyId: string, params: CreatePatrolScheduleParams) {
    const site = await prisma.guardingSite.findFirst({ where: { id: params.siteId, companyId } });
    if (!site) throw new NotFoundError("Guarding site");

    const schedule = await prisma.patrolSchedule.create({
      data: {
        companyId,
        siteId: params.siteId,
        day: params.day,
        timeSlots: {
          create: params.timeSlots.map((slot, idx) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            order: slot.order ?? idx,
            checkpoints: slot.checkpoints
              ? { create: slot.checkpoints.map((cp) => ({ name: cp.name, order: cp.order })) }
              : undefined,
          })),
        },
      },
      include: includeTimeSlots,
    });

    if (params.performedBy) {
      await prisma.auditLog.create({
        data: {
          entityType: "patrol_schedule",
          entityId: schedule.id,
          action: "schedule_created",
          newValues: JSON.stringify({ siteId: params.siteId, day: params.day, slotCount: params.timeSlots.length }),
          performedBy: params.performedBy,
        },
      });
    }

    return schedule;
  },

  /** Updates a patrol schedule. If timeSlots are provided, replaces all existing ones. */
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

    if (params.timeSlots) {
      const existingSlots = await prisma.patrolScheduleTimeSlot.findMany({
        where: { patrolScheduleId: id },
        select: { id: true },
      });
      for (const slot of existingSlots) {
        await prisma.patrolScheduleCheckpoint.deleteMany({ where: { patrolTimeSlotId: slot.id } });
      }
      await prisma.patrolScheduleTimeSlot.deleteMany({ where: { patrolScheduleId: id } });

      if (params.timeSlots.length > 0) {
        await prisma.patrolScheduleTimeSlot.createMany({
          data: params.timeSlots.map((slot, idx) => ({
            patrolScheduleId: id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            order: slot.order ?? idx,
          })),
        });

        const createdSlots = await prisma.patrolScheduleTimeSlot.findMany({
          where: { patrolScheduleId: id },
          orderBy: { order: "asc" },
        });

        for (let i = 0; i < params.timeSlots.length; i++) {
          const slotParams = params.timeSlots[i];
          if (slotParams.checkpoints && slotParams.checkpoints.length > 0) {
            await prisma.patrolScheduleCheckpoint.createMany({
              data: slotParams.checkpoints.map((cp) => ({
                patrolTimeSlotId: createdSlots[i].id,
                name: cp.name,
                order: cp.order,
              })),
            });
          }
        }
      }
    }

    const updated = await prisma.patrolSchedule.update({
      where: { id },
      data,
      include: includeTimeSlots,
    });

    if (params.performedBy) {
      await prisma.auditLog.create({
        data: {
          entityType: "patrol_schedule",
          entityId: id,
          action: "schedule_updated",
          newValues: JSON.stringify({ siteId: data.siteId, day: data.day }),
          performedBy: params.performedBy,
        },
      });
    }

    return updated;
  },

  /** Deletes a patrol schedule. Cascade deletes time slots and checkpoints. */
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
