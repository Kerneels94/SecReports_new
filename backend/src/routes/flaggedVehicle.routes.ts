import { FastifyInstance } from "fastify";
import { FlaggedVehicleController } from "../controllers/flaggedVehicle.controller";
import { requireRole } from "../middleware/requireRole";

export default async function flaggedVehicleRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/flagged-vehicles", FlaggedVehicleController.list);
  fastify.get("/flagged-vehicles/:id", FlaggedVehicleController.getById);
  fastify.post("/flagged-vehicles", { preHandler: [requireRole("owner", "manager", "guard")] }, FlaggedVehicleController.create);
  fastify.post("/flagged-vehicles/:id/resolve", { preHandler: [requireRole("owner", "manager")] }, FlaggedVehicleController.resolve);
  fastify.delete("/flagged-vehicles/:id", { preHandler: [requireRole("owner")] }, FlaggedVehicleController.delete);
}
