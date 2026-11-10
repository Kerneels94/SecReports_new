import { createInvoiceSchema } from "./invoice.schema";

describe("createInvoiceSchema", () => {
  const valid = {
    companyId: "c1",
    amount: 150000,
    dueDate: "2026-06-01",
  };

  it("passes for valid data", () => {
    expect(createInvoiceSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-positive amount", () => {
    expect(createInvoiceSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(createInvoiceSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it("rejects a non-integer amount", () => {
    expect(createInvoiceSchema.safeParse({ ...valid, amount: 12.5 }).success).toBe(false);
  });

  it("rejects an amount above the int32 max", () => {
    expect(createInvoiceSchema.safeParse({ ...valid, amount: 2_147_483_648 }).success).toBe(false);
  });

  it("rejects a missing companyId", () => {
    const { companyId, ...rest } = valid;
    expect(createInvoiceSchema.safeParse(rest).success).toBe(false);
  });

  it("coerces a valid date string into a Date", () => {
    const result = createInvoiceSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueDate).toBeInstanceOf(Date);
      expect(Number.isNaN(result.data.dueDate.getTime())).toBe(false);
    }
  });

  it("rejects an unparseable dueDate", () => {
    expect(createInvoiceSchema.safeParse({ ...valid, dueDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects a null, zero, or missing dueDate instead of coercing to the epoch", () => {
    for (const dueDate of [null, 0, undefined, ""]) {
      const result = createInvoiceSchema.safeParse({ ...valid, dueDate });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Due date is required");
      }
    }
  });

  it("reports an invalid dueDate distinctly from a missing one", () => {
    const result = createInvoiceSchema.safeParse({ ...valid, dueDate: "not-a-date" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Due date must be a valid date");
    }
  });

  it("accepts null for optional period dates", () => {
    expect(
      createInvoiceSchema.safeParse({ ...valid, periodStart: null, periodEnd: undefined }).success,
    ).toBe(true);
  });
});
