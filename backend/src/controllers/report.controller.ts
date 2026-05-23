import { FastifyRequest, FastifyReply } from "fastify";
import { ReportService } from "../services/report.service";

export const ReportController = {
  async summary(request: FastifyRequest, reply: FastifyReply) {
    const data = await ReportService.summary(request.user!.companyId, request.user!.userId);
    reply.code(200).send({ success: true, data });
  },
};
