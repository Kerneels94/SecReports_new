import { IncidentService } from "./incident.service";
import { prisma } from "../lib/db";
import { NotFoundError } from "../lib/errors";

jest.mock("../lib/db", () => ({
  prisma: {
    incident: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
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
  status: "submitted",
  incidentDate: new Date(),
  location: "Server Room",
  operatorName: "John Operator",
  dispatcher: "Jane Dispatcher",
  dispatchTime: null,
  arrivalTime: null,
  callSign: null,
  suburb: "Rivonia",
  city: "Johannesburg",
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

    it("adds date filter when search matches a date", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, search: "13 June" });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      const dateCond = where.OR.find(
        (c: any) => c.incidentDate?.gte && c.incidentDate?.lte,
      );
      expect(dateCond).toBeDefined();
      expect(dateCond.incidentDate.gte.getMonth()).toBe(5);
      expect(dateCond.incidentDate.gte.getDate()).toBe(13);
      expect(dateCond.incidentDate.lte.getDate()).toBe(13);
    });

    it("does not add date filter when search is not a date", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, search: "server room" });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      const dateCond = where.OR?.find(
        (c: any) => c.incidentDate?.gte,
      );
      expect(dateCond).toBeUndefined();
    });

    it("parses 'June 13' format as a date search", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, search: "June 13" });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      const dateCond = where.OR.find(
        (c: any) => c.incidentDate?.gte,
      );
      expect(dateCond).toBeDefined();
      expect(dateCond.incidentDate.gte.getMonth()).toBe(5);
      expect(dateCond.incidentDate.gte.getDate()).toBe(13);
    });

    it("parses month name alone as full month range", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, search: "june" });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      const dateCond = where.OR.find((c: any) => c.incidentDate?.gte);
      expect(dateCond).toBeDefined();
      expect(dateCond.incidentDate.gte.getMonth()).toBe(5);
      expect(dateCond.incidentDate.gte.getDate()).toBe(1);
      expect(dateCond.incidentDate.lte.getMonth()).toBe(5);
      expect(dateCond.incidentDate.lte.getDate()).toBe(30);
    });

    it("parses 'Month YYYY' as full month range of that year", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, search: "June 2025" });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      const dateCond = where.OR.find((c: any) => c.incidentDate?.gte);
      expect(dateCond).toBeDefined();
      expect(dateCond.incidentDate.gte.getFullYear()).toBe(2025);
      expect(dateCond.incidentDate.gte.getMonth()).toBe(5);
      expect(dateCond.incidentDate.gte.getDate()).toBe(1);
      expect(dateCond.incidentDate.lte.getFullYear()).toBe(2025);
      expect(dateCond.incidentDate.lte.getMonth()).toBe(5);
      expect(dateCond.incidentDate.lte.getDate()).toBe(30);
    });

    it("applies pagination skip and take", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({ ...defaultListParams, page: 3, perPage: 10 });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it("combines status and search filters", async () => {
      (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.incident.count as jest.Mock).mockResolvedValue(0);

      await IncidentService.list({
        ...defaultListParams, status: "open", search: "server",
      });

      const where = (prisma.incident.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.status).toBe("open");
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
      };
      (prisma.incident.findFirst as jest.Mock).mockResolvedValue(fullIncident);

      const result = await IncidentService.getById("1", "1");

      expect(result.id).toBe("1");
      expect(result.reporter).toBeDefined();
      expect(result.assignedInvestigator).toBeDefined();
    });

    it("throws NotFoundError for non-existent incident", async () => {
      (prisma.incident.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(IncidentService.getById("1", "999")).rejects.toThrow(NotFoundError);
    });
  });

  describe("create", () => {
    const createParams = {
      companyId: "1",
      title: "New Incident",
      description: "Description",
      type: "equipment_failure",
      incidentDate: new Date().toISOString(),
      location: "Office",
      suburb: "Rivonia",
      city: "Johannesburg",
      operatorName: "John Operator",
      dispatcher: "Jane Dispatcher",
      reporterId: "1",
    };

    it("creates incident, generates reference number, and writes audit log", async () => {
      (prisma.incident.create as jest.Mock).mockResolvedValue({
        ...baseIncident,
        reporter: { id: "1", name: "Test", email: "test@test.com" },
      });

      const result = await IncidentService.create(createParams);

      expect(result.title).toBe("Test Incident");
      expect(result.referenceNumber).toMatch(/^INC-/);
      expect(prisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ suburb: "Rivonia", city: "Johannesburg" }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: "incident",
          entityId: "1",
          action: "create",
          newValues: JSON.stringify({ title: "New Incident" }),
          performedBy: "1",
        },
      });
    });
  });
});
