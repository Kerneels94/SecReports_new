import { FastifyInstance } from "fastify";
import { LedgerController } from "../controllers/ledger.controller";
import { requireRole } from "../middleware/requireRole";

export default async function ledgerRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get(
    "/admin/ledger/summary",
    { preHandler: [requireRole("superadmin")] },
    LedgerController.summary,
  );

  fastify.get(
    "/admin/ledger",
    { preHandler: [requireRole("superadmin")] },
    LedgerController.listEntries,
  );
  fastify.get(
    "/admin/ledger/:id",
    { preHandler: [requireRole("superadmin")] },
    LedgerController.getEntry,
  );
  fastify.post(
    "/admin/ledger",
    { preHandler: [requireRole("superadmin")] },
    LedgerController.createEntry,
  );
  fastify.patch(
    "/admin/ledger/:id/void",
    { preHandler: [requireRole("superadmin")] },
    LedgerController.voidEntry,
  );
}
