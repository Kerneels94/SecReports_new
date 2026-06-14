/**
 * Evidence controller — handles file upload and deletion for incident evidence.
 * Requires the "evidence_uploads" subscription feature for uploads.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError } from "../lib/errors";
import crypto from "crypto";
import { SubscriptionService } from "../services/subscription.service";

export const EvidenceController = {
  /** Upload an evidence file for a given incident. Computes a SHA-256 checksum for integrity. */
  async upload(request: FastifyRequest, reply: FastifyReply) {
    await SubscriptionService.requireFeature(request.user!.companyId, "evidence_uploads");

    const { id } = request.params as { id: string };
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError("Incident");

    const file = await request.file();
    if (!file) throw new NotFoundError("File");

    const buffer = await file.toBuffer();
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    const evidence = await prisma.evidence.create({
      data: {
        incidentId: incident.id,
        fileName: file.filename,
        originalName: file.filename,
        mimeType: file.mimetype,
        fileSize: buffer.length,
        checksum,
        uploadedBy: request.user!.userId,
      },
    });

    reply.code(201).send({ success: true, data: evidence });
  },

  /** Delete an evidence record by incident and evidence ID. */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id, evidenceId } = request.params as { id: string; evidenceId: string };
    const evidence = await prisma.evidence.findFirst({
      where: { id: evidenceId, incidentId: id },
    });
    if (!evidence) throw new NotFoundError("Evidence");

    await prisma.evidence.delete({ where: { id: evidence.id } });
    reply.code(204).send();
  },
};
