import {
  BILLING_DAY,
  getNextBillingDate,
  formatPrice,
  formatBillingDate,
  planWording,
  PLAN_WORDING,
} from "./billing";

describe("billing helpers", () => {
  it("exports the billing day as 25", () => {
    expect(BILLING_DAY).toBe(25);
  });

  describe("getNextBillingDate", () => {
    it("returns the 25th of the current month when before the 25th", () => {
      const from = new Date(2026, 7, 10);
      const result = getNextBillingDate(from);
      expect(result.getDate()).toBe(25);
      expect(result.getMonth()).toBe(7);
    });

    it("returns the 25th of the next month on or after the 25th", () => {
      const from = new Date(2026, 7, 25);
      const result = getNextBillingDate(from);
      expect(result.getDate()).toBe(25);
      expect(result.getMonth()).toBe(8);
    });
  });

  describe("formatPrice", () => {
    it("formats zero as Free", () => {
      expect(formatPrice(0)).toBe("Free");
    });

    it("formats cents into a ZAR string", () => {
      expect(formatPrice(150000)).toBe("R 1,500");
    });
  });

  describe("formatBillingDate", () => {
    it("formats a date with day, month and year", () => {
      expect(formatBillingDate(new Date(2026, 7, 25))).toContain("2026");
    });
  });

  describe("planWording", () => {
    it("returns the landing page wording for the Free plan", () => {
      const wording = planWording({ name: "Free", siteLimit: 0, userLimit: 0, features: "[]" });
      expect(wording.description).toBe(
        "Full access to all features — no limits during your trial.",
      );
      expect(wording.limit).toBe("14-day trial");
      expect(wording.features).toEqual(PLAN_WORDING.Free.features);
    });

    it("returns the landing page wording for the Professional plan", () => {
      const wording = planWording({ name: "Professional", siteLimit: 15, userLimit: 5, features: "[\"basic_crud\"]" });
      expect(wording.description).toBe("For growing security teams managing multiple sites.");
      expect(wording.limit).toBe("Up to 15 sites");
      expect(wording.features).toContain("CSV & PDF export");
      expect(wording.features).toContain("Priority support");
    });

    it("returns the landing page wording for the Enterprise plan", () => {
      const wording = planWording({ name: "Enterprise", siteLimit: 0, userLimit: 0, features: "[]" });
      expect(wording.description).toBe(
        "For large security operations with unlimited site coverage.",
      );
      expect(wording.limit).toBe("Unlimited sites");
      expect(wording.features).toEqual(PLAN_WORDING.Enterprise.features);
    });

    it("falls back to plan limits for unknown plans", () => {
      const limited = planWording({ name: "Bespoke", siteLimit: 3, userLimit: 2, features: "[\"extra\"]" });
      expect(limited.description).toBe("For teams managing up to 3 sites.");
      expect(limited.limit).toBe("Up to 3 sites");
      expect(limited.features).toEqual(["extra"]);

      const unlimited = planWording({ name: "Bespoke", siteLimit: 0, userLimit: 0, features: "[]" });
      expect(unlimited.description).toBe("For organisations with unlimited site coverage.");
      expect(unlimited.limit).toBe("Unlimited sites");
    });
  });
});
