/**
 * Investigation controller — manages investigation details and corrective actions for incidents.
 * Requires the "full_lifecycle" subscription feature for all endpoints.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/db";
import { NotFoundError, ValidationError } from "../lib/errors";
import { z } from "zod";
import { SubscriptionService } from "../services/subscription.service";

const upsertSchema = z.object({
  findings: z.string().optional(),
  rootCause: z.string().optional(),
  recommendations: z.string().optional(),
  closureNotes: z.string().optional(),
  completedAt: z.string().optional(),
});

const createActionSchema = z.object({
  description: z.string().min(1),
  ownerId: z.string().min(1),
  dueDate: z.string().min(1),
});

const updateActionSchema = z.object({
  status: z.enum(["open", "in_progress", "completed", "overdue"]).optional(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  dueDate: z.string().optional(),
  completedAt: z.string().optional(),
});

export const InvestigationController = {
  /** Get the investigation record for an incident (returns null if none exists). */
  async get(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "full_lifecycle");

    const { id } = request.params as { id: string };
    const investigation = await prisma.investigation.findUnique({
      where: { incidentId: id },
    });
    if (!investigation) {
      reply.code(200).send({ success: true, data: null });
      return;
    }
    reply.code(200).send({ success: true, data: investigation });
  },

  /** Create or update the investigation fields (findings, root cause, recommendations, closure notes). */
  async upsert(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "full_lifecycle");

    const { id } = request.params as { id: string };
    const parsed = upsertSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError("Incident");

    const data: any = {};
    if (parsed.data.findings !== undefined) data.findings = parsed.data.findings;
    if (parsed.data.rootCause !== undefined) data.rootCause = parsed.data.rootCause;
    if (parsed.data.recommendations !== undefined) data.recommendations = parsed.data.recommendations;
    if (parsed.data.closureNotes !== undefined) data.closureNotes = parsed.data.closureNotes;
    if (parsed.data.completedAt !== undefined) data.completedAt = new Date(parsed.data.completedAt);

    const investigation = await prisma.investigation.upsert({
      where: { incidentId: incident.id },
      create: { incidentId: incident.id, ...data },
      update: data,
    });

    reply.code(200).send({ success: true, data: investigation });
  },

  /** List corrective actions for an incident, ordered by due date ascending. */
  async listActions(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "full_lifecycle");

    const { id } = request.params as { id: string };
    const actions = await prisma.correctiveAction.findMany({
      where: { incidentId: id },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
    });

    reply.code(200).send({ success: true, data: actions });
  },

  /** Create a new corrective action for an incident. */
  async createAction(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "full_lifecycle");

    const { id } = request.params as { id: string };
    const parsed = createActionSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError("Incident");

    const action = await prisma.correctiveAction.create({
      data: {
        incidentId: incident.id,
        description: parsed.data.description,
        ownerId: parsed.data.ownerId,
        dueDate: new Date(parsed.data.dueDate),
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    reply.code(201).send({ success: true, data: action });
  },

  /** Update a corrective action (status, description, owner, due date, completion). */
  async updateAction(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "full_lifecycle");

    const { actionId } = request.params as { actionId: string };
    const parsed = updateActionSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const data: any = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.ownerId !== undefined) data.ownerId = parsed.data.ownerId;
    if (parsed.data.dueDate !== undefined) data.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.completedAt !== undefined) data.completedAt = new Date(parsed.data.completedAt);

    const action = await prisma.correctiveAction.update({
      where: { id: actionId },
      data,
      include: { owner: { select: { id: true, name: true } } },
    });

    reply.code(200).send({ success: true, data: action });
  },
};
