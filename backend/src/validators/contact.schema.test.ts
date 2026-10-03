import { contactSchema } from "./contact.schema";

describe("contactSchema", () => {
  const valid = {
    name: "Thabo Mokoena",
    email: "thabo@acmesecurity.co.za",
    company: "Acme Security",
    message: "We need pricing for 20 users across 12 sites.",
  };

  it("passes for valid data", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it("passes without a company", () => {
    const result = contactSchema.safeParse({ ...valid, company: undefined });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = contactSchema.safeParse({
      ...valid,
      name: "  Thabo Mokoena  ",
    });
    expect(result.success && result.data.name).toBe("Thabo Mokoena");
  });

  it("rejects an empty name", () => {
    expect(contactSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(contactSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects an empty message", () => {
    expect(contactSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
  });

  it("rejects an over-long message", () => {
    expect(contactSchema.safeParse({ ...valid, message: "a".repeat(5001) }).success).toBe(false);
  });

  it("rejects an over-long name", () => {
    expect(contactSchema.safeParse({ ...valid, name: "a".repeat(256) }).success).toBe(false);
  });

  it("rejects an over-long company", () => {
    expect(contactSchema.safeParse({ ...valid, company: "a".repeat(256) }).success).toBe(false);
  });

  it("rejects a missing message field", () => {
    const { message: _omitted, ...withoutMessage } = valid;
    expect(contactSchema.safeParse(withoutMessage).success).toBe(false);
  });
});