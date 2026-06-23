import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      userId: string;
      role: string;
      companyId: string;
    };
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
      done?: (err?: Error) => void,
    ) => Promise<void>;
  }
}
