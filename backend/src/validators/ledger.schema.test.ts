import {
  createLedgerEntrySchema,
  ledgerListQuerySchema,
} from "./ledger.schema";

describe("ledger schemas", () => {
  const validEntry = {
    companyId: "company1",
    entryType: "payment",
    amount: 150000,
  };

  describe("createLedgerEntrySchema", () => {
    it("passes for valid data", () => {
      const result = createLedgerEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
    });

    it("passes with all optional fields", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validEntry,
        currency: "ZAR",
        description: "A description",
        reference: "PAY-INV-2026-0001",
        postedAt: "2026-01-15T10:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("fails for an invalid entry type", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validEntry,
        entryType: "cash",
      });
      expect(result.success).toBe(false);
    });

    it("fails for a non-integer amount", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validEntry,
        amount: 1500.5,
      });
      expect(result.success).toBe(false);
    });

    it("fails for a zero amount", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validEntry,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("fails for an out-of-range amount", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validEntry,
        amount: 2147483648,
      });
      expect(result.success).toBe(false);
    });

    it("fails for an invalid postedAt date", () => {
      const result = createLedgerEntrySchema.safeParse({
        ...validEntry,
        postedAt: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("fails when companyId is missing", () => {
      const { companyId, ...rest } = validEntry;
      const result = createLedgerEntrySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe("ledgerListQuerySchema", () => {
    it("passes for an empty query", () => {
      const result = ledgerListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("passes for valid filters", () => {
      const result = ledgerListQuerySchema.safeParse({
        companyId: "company1",
        entryType: "payment",
        status: "posted",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
      });
      expect(result.success).toBe(true);
    });

    it("fails for an invalid entryType filter", () => {
      const result = ledgerListQuerySchema.safeParse({ entryType: "cash" });
      expect(result.success).toBe(false);
    });

    it("fails for an invalid status filter", () => {
      const result = ledgerListQuerySchema.safeParse({ status: "archived" });
      expect(result.success).toBe(false);
    });

    it("fails for an invalid date filter", () => {
      const result = ledgerListQuerySchema.safeParse({ dateFrom: "nope" });
      expect(result.success).toBe(false);
    });
  });
});
