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

const baseIncident = {
  id: "1",
  companyId: "1",
  referenceNumber: "INC-2026-0001",
  title: "Test Incident",
  description: "Description",
  type: "equipment_failure",
  severity: "high",
  status: "submitted",
  incidentDate: new Date(),
  location: "Server Room",
  operatorName: "John Operator",
  dispatcher: "Jane Dispatcher",
  dispatchTime: null,
  arrivalTime: null,
  callSign: null,
  propertyAddress: null,
  clientName: null,
  clientCode: null,
  businessOrComplex: null,
  sapsReference: null,
  reporterId: "1",
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultListParams = { page: 1, perPage: 20, companyId: "1" };

describe("IncidentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("returns paginated incidents with default params", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([baseIncident]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(1);

      const result = await IncidentService.list(defaultListParams);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(20);
    });

    it("filters by status", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, status: "open" });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: "1", status: "open" }),
        }),
      );
    });

    it("filters by severity", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, severity: "critical" });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.severity).toBe("critical");
    });

    it("filters by search on title and referenceNumber", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, search: "INC-2026" });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { title: { contains: "INC-2026" } },
          { referenceNumber: { contains: "INC-2026" } },
        ]),
      );
    });

    it("applies pagination skip and take", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, page: 3, perPage: 10 });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it("combines status, severity, and search filters", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({
        ...defaultListParams, status: "open", severity: "critical", search: "server",
      });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.status).toBe("open");
      expect(where.severity).toBe("critical");
      expect(where.OR).toBeDefined();
    });

    it("returns empty data array and zero total when no incidents match", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      const result = await IncidentService.list({ ...defaultListParams, status: "nonexistent" });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns incident with all included relations", async () => {
      const fullIncident = {
        ...baseIncident,
        reporter: { id: "1", name: "Reporter", email: "reporter@test.com" },
        assignedInvestigator: { id: "2", name: "Investigator", email: "inv@test.com" },
        people: [{ id: "1", name: "Witness", role: "witness" }],
        evidence: [{ id: "1", fileName: "photo.jpg" }],
        comments: [
          { id: "1", content: "A comment", user: { id: "1", name: "Reporter" }, createdAt: new Date() },
        ],
        investigation: { id: "1", details: "Investigation in progress" },
        correctiveActions: [
          { id: "1", action: "Fix the issue", owner: { id: "1", name: "Reporter" } },
        ],
      };
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(fullIncident);

      const result = await IncidentService.getById("1");

      expect(result.id).toBe("1");
      expect(result.reporter).toBeDefined();
      expect(result.assignedInvestigator).toBeDefined();
      expect(result.people).toHaveLength(1);
      expect(result.evidence).toHaveLength(1);
      expect(result.comments).toHaveLength(1);
      expect(result.investigation).toBeDefined();
      expect(result.correctiveActions).toHaveLength(1);
    });

    it("throws NotFoundError for non-existent incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(IncidentService.getById("999")).rejects.toThrow(NotFoundError);
    });
  });

  describe("create", () => {
    const createParams = {
      companyId: "1",
      title: "New Incident",
      description: "Description",
      type: "equipment_failure",
      severity: "high",
      incidentDate: new Date().toISOString(),
      location: "Office",
      operatorName: "John Operator",
      dispatcher: "Jane Dispatcher",
      reporterId: "1",
    };

    it("creates incident, generates reference number, and writes audit log", async () => {
      (prisma.incident.create as jest.Mock).mockResolvedValue({
        ...baseIncident,
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        people: [],
      });

      const result = await IncidentService.create(createParams);

      expect(result.title).toBe("Test Incident");
      expect(result.referenceNumber).toMatch(/^INC-/);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: "incident",
          entityId: "1",
          action: "create",
          newValues: JSON.stringify({ title: "New Incident", severity: "high" }),
          performedBy: "1",
        },
      });
    });

    it("creates incident with people array using create nested", async () => {
      const people = [
        { name: "John", role: "witness", contact: "john@test.com", notes: "Saw everything" },
        { name: "Jane", role: "victim" },
      ];
      (prisma.incident.create as jest.Mock).mockResolvedValue({
        ...baseIncident,
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        people: people.map((p, i) => ({ id: String(i + 1), ...p })),
      });

      await IncidentService.create({ ...createParams, people });

      expect(prisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            people: { create: people },
          }),
        }),
      );
    });

    it("does not include people key when no people provided", async () => {
      (prisma.incident.create as jest.Mock).mockResolvedValue({
        ...baseIncident,
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        people: [],
      });

      await IncidentService.create(createParams);

      const data = (prisma.incident.create as jest.Mock).mock.calls[0][0].data;
      expect(data.people).toBeUndefined();
    });
  });

  describe("update", () => {
    const updateParams = { title: "Updated Title", severity: "critical" };

    it("allows reporter to update own incident and creates audit log", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);
      (prisma.incident.update as jest.Mock).mockResolvedValue({
        ...baseIncident,
        ...updateParams,
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        assignedInvestigator: null,
      });

      const result = await IncidentService.update("1", updateParams, "1", "reporter");

      expect(result.title).toBe("Updated Title");
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: "incident",
          entityId: "1",
          action: "update",
          performedBy: "1",
        }),
      });
    });

    it("throws ForbiddenError when reporter edits another's incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);

      await expect(
        IncidentService.update("1", { title: "Hack" }, "2", "reporter"),
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to edit any incident regardless of reporterId", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);
      (prisma.incident.update as jest.Mock).mockResolvedValue({
        ...baseIncident,
        title: "Admin edit",
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        assignedInvestigator: null,
      });

      const result = await IncidentService.update("1", { title: "Admin edit" }, "2", "admin");

      expect(result.title).toBe("Admin edit");
    });

    it("allows manager to edit any incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);
      (prisma.incident.update as jest.Mock).mockResolvedValue({
        ...baseIncident,
        title: "Mgr edit",
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        assignedInvestigator: null,
      });

      const result = await IncidentService.update("1", { title: "Mgr edit" }, "2", "manager");

      expect(result.title).toBe("Mgr edit");
    });

    it("performs partial update with only provided fields", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);
      (prisma.incident.update as jest.Mock).mockResolvedValue({
        ...baseIncident,
        title: "Only title changed",
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        assignedInvestigator: null,
      });

      await IncidentService.update("1", { title: "Only title changed" }, "1", "reporter");

      const updateData = (prisma.incident.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.title).toBe("Only title changed");
      expect(updateData.severity).toBeUndefined();
      expect(updateData.description).toBeUndefined();
    });

    it("throws NotFoundError for non-existent incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        IncidentService.update("999", { title: "Nope" }, "1", "admin"),
      ).rejects.toThrow(NotFoundError);
    });

    it("includes oldValues in audit log with previous title, severity, status", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);
      (prisma.incident.update as jest.Mock).mockResolvedValue({
        ...baseIncident,
        title: "Updated",
        reporter: { id: "1", name: "Test", email: "test@test.com" },
        assignedInvestigator: null,
      });

      await IncidentService.update("1", { title: "Updated" }, "1", "reporter");

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            oldValues: JSON.stringify({
              title: "Test Incident",
              severity: "high",
              status: "submitted",
            }),
          }),
        }),
      );
    });
  });

  describe("updateStatus", () => {
    it("changes status and writes audit log with old and new status", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);
      (prisma.incident.update as jest.Mock).mockResolvedValue({ ...baseIncident, status: "under_review" });

      const result = await IncidentService.updateStatus("1", "under_review", "1");

      expect(result.status).toBe("under_review");
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: "incident",
          entityId: "1",
          action: "status_change",
          oldValues: JSON.stringify({ status: "submitted" }),
          newValues: JSON.stringify({ status: "under_review" }),
          performedBy: "1",
        },
      });
    });

    it("throws NotFoundError for non-existent incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(IncidentService.updateStatus("999", "closed", "1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("deletes own incident as reporter and creates audit log", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);

      await IncidentService.delete("1", "1", "reporter");

      expect(prisma.incident.delete).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: "incident",
          entityId: "1",
          action: "delete",
          performedBy: "1",
        }),
      });
    });

    it("throws ForbiddenError when reporter deletes another's incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);

      await expect(IncidentService.delete("1", "2", "reporter")).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to delete any incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);

      await IncidentService.delete("1", "2", "admin");

      expect(prisma.incident.delete).toHaveBeenCalledWith({ where: { id: "1" } });
    });

    it("allows investigator to delete any incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(baseIncident);

      await IncidentService.delete("1", "2", "investigator");

      expect(prisma.incident.delete).toHaveBeenCalledWith({ where: { id: "1" } });
    });

    it("throws NotFoundError for non-existent incident", async () => {
      (prisma.incident.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(IncidentService.delete("999", "1", "admin")).rejects.toThrow(NotFoundError);
    });
  });
});
