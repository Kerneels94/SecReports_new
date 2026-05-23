import { IncidentService } from "./incident.service";
import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError } from "../lib/errors";

jest.mock("../lib/db", () => ({
  prisma: {
    incident: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

const mockIncident = {
  id: 1,
  companyId: 1,
  referenceNumber: "INC-2026-0001",
  title: "Test Incident",
  description: "Description",
  type: "equipment_failure",
  severity: "high",
  category: "Infrastructure",
  status: "submitted",
  incidentDate: new Date(),
  location: "Server Room",
  reporterId: 1,
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("IncidentService", () => {
  describe("list", () => {
    it("returns paginated incidents", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([mockIncident]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(1);

      const result = await IncidentService.list({ page: 1, perPage: 20, companyId: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe("getById", () => {
    it("returns incident by id", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue({
        ...mockIncident,
        reporter: { id: 1, name: "Test", email: "test@test.com" },
        assignedInvestigator: null,
        people: [],
        evidence: [],
        comments: [],
        investigation: null,
        correctiveActions: [],
      });

      const result = await IncidentService.getById(1);
      expect(result.id).toBe(1);
      expect(result.title).toBe("Test Incident");
    });

    it("throws for non-existent incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(IncidentService.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe("create", () => {
    it("creates an incident with audit log", async () => {
      (prisma.incident.create as jest.Mock).mockResolvedValue({
        ...mockIncident,
        reporter: { id: 1, name: "Test", email: "test@test.com" },
        people: [],
      });

      const result = await IncidentService.create({
        companyId: 1,
        title: "Test Incident",
        description: "Description",
        type: "equipment_failure",
        severity: "high",
        category: "Infrastructure",
        incidentDate: new Date().toISOString(),
        location: "Server Room",
        reporterId: 1,
      });

      expect(result.title).toBe("Test Incident");
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("delete", () => {
    it("deletes own incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(mockIncident);

      await IncidentService.delete(1, 1, "reporter");
      expect(prisma.incident.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("throws when deleting another's incident as reporter", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(mockIncident);

      await expect(IncidentService.delete(1, 2, "reporter")).rejects.toThrow(ForbiddenError);
    });
  });
});
