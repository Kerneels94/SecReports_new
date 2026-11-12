import { createIncidentSchema, paginationSchema } from "./incident.schema";

describe("incident schemas", () => {
  const validCreate = {
    title: "Test Incident",
    description: "A description",
    type: "equipment_failure",
    incidentDate: "2026-05-23",
    operatorName: "John Operator",
    dispatcher: "Jane Dispatcher",
    suburb: "Rivonia",
    city: "Johannesburg",
    alarmType: "Burglary",
  };

  describe("createIncidentSchema", () => {
    it("passes for valid data", () => {
      const result = createIncidentSchema.safeParse(validCreate);
      expect(result.success).toBe(true);
    });

    it("fails when title is missing", () => {
      const { title, ...rest } = validCreate;
      const result = createIncidentSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe("createIncidentSchema alarm type and coordinates", () => {
    it("fails when alarmType is missing", () => {
      const { alarmType, ...rest } = validCreate;
      expect(createIncidentSchema.safeParse(rest).success).toBe(false);
    });

    it("fails for an unknown alarmType", () => {
      expect(createIncidentSchema.safeParse({ ...validCreate, alarmType: "Fire" }).success).toBe(false);
    });

    it("accepts every allowed alarmType", () => {
      for (const alarmType of ["Burglary", "Panic", "Duress"]) {
        expect(createIncidentSchema.safeParse({ ...validCreate, alarmType }).success).toBe(true);
      }
    });

    it("accepts valid coordinates", () => {
      expect(
        createIncidentSchema.safeParse({ ...validCreate, latitude: -33.92, longitude: 18.42 }).success,
      ).toBe(true);
    });

    it("rejects out-of-range coordinates", () => {
      expect(createIncidentSchema.safeParse({ ...validCreate, latitude: 91 }).success).toBe(false);
      expect(createIncidentSchema.safeParse({ ...validCreate, longitude: -181 }).success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("defaults page to 1 and perPage to 20", () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.perPage).toBe(20);
      }
    });

    it("accepts valid overrides", () => {
      const result = paginationSchema.safeParse({ page: "3", perPage: "15" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.perPage).toBe(15);
      }
    });

    it("rejects perPage over 100", () => {
      const result = paginationSchema.safeParse({ perPage: "101" });
      expect(result.success).toBe(false);
    });
  });
});
