import { createIncidentSchema, paginationSchema } from "./incident.schema";

describe("incident schemas", () => {
  const validCreate = {
    title: "Test Incident",
    description: "A description",
    type: "equipment_failure",
    incidentDate: "2026-05-23",
    operatorName: "John Operator",
    dispatcher: "Jane Dispatcher",
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
